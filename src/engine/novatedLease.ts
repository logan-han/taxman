import type { FYData } from '../data';
import {
  CAR_THRESHOLDS,
  EV_PHASE_OUT,
  FBT_RATES,
  MIN_RESIDUAL_PERCENT,
  evFbtTreatment,
  monthKey,
} from '../data/fbt';
import type { FbtTreatment, VehicleType } from '../data/fbt';
import { calculate, DEFAULT_INPUTS } from './calculate';
import type { CalculationResult } from './calculate';
import { amortisedRepayment } from './mortgage';

/**
 * Novated lease true-cost model.
 *
 * The design goal is the inverse of a provider quote: recover what the quote
 * hides (the effective interest rate, the residual payout with GST, the luxury
 * vehicle adjustment, RFBA flow-through to HELP/MLS/Div 293) and compare the
 * lease against realistic alternatives on identical assumptions.
 *
 * Comparison frame: same car, same realistic running costs, same term, in all
 * four scenarios; each scenario ends with the car owned outright, so the car's
 * end value cancels and scenarios differ only in financing + tax treatment.
 * Cash timing differences are compared as "end-of-term dollars": every outflow
 * is compounded forward at the mortgage/offset rate (the opportunity cost of
 * money for anyone with a home loan).
 *
 * Deliberate simplifications (documented in RESEARCH-NOVATED.md):
 * - the 1/3 base-value reduction after 4 full FBT years is not applied
 *   (slightly overstates year-5 ECM/RFBA on 5-year leases);
 * - running-cost budgets are taken as real costs, not padded budgets;
 * - the announced $75k phase-2 cap is tested against the car price.
 */

export const FORTNIGHTS_PER_YEAR = 26;

export interface NovatedLeaseInputs {
  vehicleType: VehicleType;
  /** drive-away price on the quote */
  carPrice: number;
  /**
   * FBT base value if the quote discloses it (drive-away less government
   * on-roads); 0 uses the car price. Drives RFBA and ECM contributions.
   */
  fbtBaseValue: number;
  /** amount financed if the quote discloses it; 0 = estimate from the price */
  amountFinanced: number;
  /** finance/lease payment per fortnight, as quoted */
  financePerFortnight: number;
  /** running-cost budget per fortnight, as quoted (budgets are ex GST) */
  runningPerFortnight: number;
  termYears: number;
  /** residual (balloon) figure on the quote */
  residual: number;
  /** quote shows the residual inclusive of GST (presentation varies) */
  residualIncludesGst: boolean;
  /** lease commencement month: drives the EV exemption phase rules */
  startYear: number;
  startMonth: number;
  /** employer passes the Div 242 luxury vehicle adjustment into the package */
  lvaPassedOn: boolean;
  /** your situation (drives the tax side of every scenario) */
  salary: number;
  hasStudentLoan: boolean;
  privateHospitalCover: boolean;
  /** alternative financing assumptions */
  carLoanRatePercent: number;
  mortgageRatePercent: number;
}

/**
 * Defaults show a $75,000 EV: the announced phase-2 exemption cap, so the
 * example stays fully exempt whichever side of April 2027 it commences. The
 * finance shape is a typical big-provider quote: 12% implied (challengers
 * advertise 6.5-7.5%; community-audited quotes run 11-14%) with the residual
 * at the ATO 5-year minimum. The researched Maxxia fixture quote, which solves
 * to 12.8-19.4% depending on the undisclosed financed amount, lives in
 * RESEARCH-NOVATED.md and the engine tests.
 */
export function defaultNovated(today: Date): NovatedLeaseInputs {
  return {
    vehicleType: 'bev',
    carPrice: 75_000,
    fbtBaseValue: 0,
    amountFinanced: 0,
    financePerFortnight: 594.66,
    runningPerFortnight: 191.7,
    termYears: 5,
    residual: 19_310,
    residualIncludesGst: false,
    startYear: today.getFullYear(),
    startMonth: today.getMonth() + 1,
    lvaPassedOn: true,
    salary: 100_000,
    hasStudentLoan: false,
    privateHospitalCover: false,
    carLoanRatePercent: 7.0,
    mortgageRatePercent: 5.9,
  };
}

/**
 * Solve the annual nominal rate implied by (financed, payment, term, residual)
 * via bisection on the fortnightly rate: the quote never states it.
 * Returns a percent (e.g. 19.36), 0 when no interest is being charged, or
 * null when the inputs cannot anchor a rate.
 */
export function impliedAnnualRatePercent(
  amountFinanced: number,
  paymentPerFortnight: number,
  fortnights: number,
  residualExGst: number,
): number | null {
  if (amountFinanced <= 0 || paymentPerFortnight <= 0 || fortnights <= 0) return null;
  if (paymentPerFortnight * fortnights + residualExGst <= amountFinanced) return 0;

  const pv = (r: number) =>
    (paymentPerFortnight * (1 - Math.pow(1 + r, -fortnights))) / r +
    residualExGst * Math.pow(1 + r, -fortnights);

  let lo = 1e-9;
  let hi = 0.06; // 156% nominal: beyond any plausible quote
  if (pv(hi) > amountFinanced) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > amountFinanced) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * FORTNIGHTS_PER_YEAR * 100;
}

export type RateGrade = 'competitive' | 'typical' | 'elevated' | 'high';

/**
 * Bands from market research: challenger providers advertise 6.5-7.5%
 * comparison (Gridly, mid-2026), big-provider quotes commonly audit to 11-14%
 * (leasecheck.au grades 10-13.99% elevated, 14%+ high).
 */
export function gradeRate(aprPercent: number): RateGrade {
  if (aprPercent < 8) return 'competitive';
  if (aprPercent <= 12) return 'typical';
  if (aprPercent < 14) return 'elevated';
  return 'high';
}

/**
 * Div 242 luxury vehicle adjustment per year, SG Fleet's published formula at
 * a 30% employer tax rate. Applies when the amount financed exceeds the car
 * limit, regardless of FBT exemption. Employers may waive it.
 */
export function luxuryVehicleAdjustmentPerYear(
  amountFinanced: number,
  residualExGst: number,
  carLimit: number,
  termYears: number,
  employerTaxRate = 0.3,
): number {
  if (amountFinanced <= carLimit || termYears <= 0) return 0;
  const nonClaimableCapital = amountFinanced - residualExGst;
  const deemedSaleProceeds = (residualExGst * carLimit) / amountFinanced;
  const allowableDepreciation = carLimit - deemedSaleProceeds;
  const perTerm =
    ((nonClaimableCapital - allowableDepreciation) * employerTaxRate) / (1 - employerTaxRate);
  return Math.max(0, perTerm / termYears);
}

export interface Scenario {
  key: 'novated' | 'cash' | 'loan' | 'redraw';
  label: string;
  /** steady-state outflow per fortnight (car + running, after tax effects) */
  perFortnight: number;
  /** paid at the start (cash purchase) */
  upfront: number;
  /** paid at the end (residual payout including GST) */
  final: number;
  /** simple sum of every dollar out */
  nominalTotal: number;
  /** all outflows compounded to term end at the offset rate */
  endOfTermCost: number;
  /** this scenario's end-of-term cost minus the lease's (negative: cheaper than the lease) */
  vsLease: number;
}

/** compound every outflow forward to term end at the offset/mortgage rate */
function endOfTermCost(
  upfront: number,
  perFortnight: number,
  final: number,
  offsetRatePercent: number,
  fortnights: number,
): number {
  const r = offsetRatePercent / 100 / FORTNIGHTS_PER_YEAR;
  const fvUpfront = upfront * Math.pow(1 + r, fortnights);
  const fvStream =
    r === 0 ? perFortnight * fortnights : (perFortnight * (Math.pow(1 + r, fortnights) - 1)) / r;
  return fvUpfront + fvStream + final;
}

export interface NovatedLeaseResult {
  /** amount financed used by the model */
  amountFinanced: number;
  financedIsEstimate: boolean;
  gstCreditOnCar: number;
  gstCreditIsCapped: boolean;
  thresholds: (typeof CAR_THRESHOLDS)['2026-27'];

  impliedAprPercent: number | null;
  impliedGrade: RateGrade | null;
  totalFinancePayments: number;
  interestAndFees: number;
  residualExGst: number;
  residualGst: number;
  residualPayout: number;
  leaseToOwnTotal: number;
  minResidualPercent: number | null;
  minResidualAmount: number | null;

  treatment: FbtTreatment;
  /** phase rules applied but not yet law (commencement in phase 2/3) */
  phaseRulesAreAnnouncedOnly: boolean;
  notionalTaxableValue: number;
  rfbaPerYear: number;
  ecmPerYear: number;
  ecmGstPerYear: number;
  lvaPerYear: number;
  packageCostsPerYear: number;
  preTaxPerYear: number;

  baseline: CalculationResult;
  withLease: CalculationResult;
  taxSavedPerYear: number;
  takeHomeDropPerYear: number;
  stslDeltaPerYear: number;
  mlsDeltaPerYear: number;
  div293DeltaPerYear: number;

  /** retail running costs for the non-lease scenarios (GST added back, ex rego) */
  retailRunningPerFortnight: number;
  scenarios: Scenario[];
  /** cheapest non-lease scenario by end-of-term cost */
  bestAlternative: Scenario;
  novated: Scenario;
  /** positive: the lease costs more than the best alternative */
  leaseVsBest: number;
}

export function calculateNovatedLease(inputs: NovatedLeaseInputs, fy: FYData): NovatedLeaseResult {
  const t = CAR_THRESHOLDS[fy.fy];
  const termYears = Math.min(5, Math.max(1, Math.round(inputs.termYears)));
  const fortnights = termYears * FORTNIGHTS_PER_YEAR;

  const carPrice = Math.max(0, inputs.carPrice);
  const uncappedGst = carPrice / 11;
  const gstCreditOnCar = Math.min(uncappedGst, t.maxGstCredit);
  const gstCreditIsCapped = uncappedGst > t.maxGstCredit;
  const financedIsEstimate = inputs.amountFinanced <= 0;
  const amountFinanced = financedIsEstimate
    ? Math.max(0, carPrice - gstCreditOnCar)
    : inputs.amountFinanced;

  const residualExGst = inputs.residualIncludesGst ? inputs.residual / 1.1 : inputs.residual;
  const residualGst = residualExGst * 0.1;
  const residualPayout = residualExGst + residualGst;

  const impliedAprPercent = impliedAnnualRatePercent(
    amountFinanced,
    inputs.financePerFortnight,
    fortnights,
    residualExGst,
  );
  const impliedGrade = impliedAprPercent === null ? null : gradeRate(impliedAprPercent);

  const totalFinancePayments = inputs.financePerFortnight * fortnights;
  const leaseToOwnTotal = totalFinancePayments + residualPayout;
  const interestAndFees = totalFinancePayments + residualExGst - amountFinanced;

  const minResidualPercent = MIN_RESIDUAL_PERCENT[termYears] ?? null;
  const minResidualAmount =
    minResidualPercent === null ? null : amountFinanced * minResidualPercent;

  // FBT treatment at commencement, grandfathered for the term
  const treatment = evFbtTreatment(
    inputs.vehicleType,
    carPrice,
    inputs.startYear,
    inputs.startMonth,
    t.lctFuelEfficient,
  );
  const phaseRulesAreAnnouncedOnly =
    !EV_PHASE_OUT.legislated &&
    inputs.vehicleType === 'bev' &&
    treatment.kind !== 'taxable' &&
    monthKey(inputs.startYear, inputs.startMonth) >= EV_PHASE_OUT.phase2From;

  // Exempt: everything pre-tax, but the notional value is reportable (RFBA).
  // Otherwise: ECM post-tax contributions zero the FBT, so no RFBA, and the
  // employer's GST on those contributions is passed back into the package.
  // The base value excludes government on-roads; fall back to the price.
  const fbtBase = inputs.fbtBaseValue > 0 ? inputs.fbtBaseValue : carPrice;
  const notionalTaxableValue = FBT_RATES.statutoryFraction * fbtBase;
  const rfbaPerYear =
    treatment.kind === 'exempt' ? notionalTaxableValue * FBT_RATES.grossUpType2 : 0;
  const lvaPerYear = inputs.lvaPassedOn
    ? luxuryVehicleAdjustmentPerYear(amountFinanced, residualExGst, t.carLimit, termYears)
    : 0;

  const ecmTarget = treatment.kind === 'exempt' ? 0 : treatment.statutoryFraction * fbtBase;
  const ecmGstPerYear = ecmTarget / 11;
  const packageCostsPerYear =
    (inputs.financePerFortnight + inputs.runningPerFortnight) * FORTNIGHTS_PER_YEAR +
    lvaPerYear +
    ecmGstPerYear;
  const ecmPerYear = Math.min(ecmTarget, packageCostsPerYear);
  const preTaxPerYear = packageCostsPerYear - ecmPerYear;

  const person = {
    ...DEFAULT_INPUTS,
    salary: inputs.salary,
    hasStudentLoan: inputs.hasStudentLoan,
    privateHospitalCover: inputs.privateHospitalCover,
  };
  const baseline = calculate(person, fy);
  const withLease = calculate(
    { ...person, deductions: preTaxPerYear, reportableFringeBenefits: rfbaPerYear },
    fy,
  );

  // `deductions` reduces taxable income but not the engine's take-home figure,
  // so the true drop in cash received = package deduction - tax saved.
  const taxSavedPerYear = baseline.totalTax - withLease.totalTax;
  const takeHomeDropPerYear = preTaxPerYear - taxSavedPerYear;
  const stslDeltaPerYear = withLease.studentLoanRepayment - baseline.studentLoanRepayment;
  const mlsDeltaPerYear = withLease.medicareSurcharge - baseline.medicareSurcharge;
  const div293DeltaPerYear = withLease.div293Payable - baseline.div293Payable;

  // Non-lease scenarios pay GST on running costs. Slight approximation: the
  // rego/CTP slice is GST-free, but it is small enough to ignore.
  const retailRunningPerFortnight = inputs.runningPerFortnight * 1.1;

  const offset = inputs.mortgageRatePercent;
  const mk = (
    key: Scenario['key'],
    label: string,
    perFortnight: number,
    upfront: number,
    final: number,
  ): Scenario => ({
    key,
    label,
    perFortnight,
    upfront,
    final,
    nominalTotal: upfront + perFortnight * fortnights + final,
    endOfTermCost: endOfTermCost(upfront, perFortnight, final, offset, fortnights),
    vsLease: 0,
  });

  const novated = mk(
    'novated',
    'Novated lease',
    (takeHomeDropPerYear + ecmPerYear) / FORTNIGHTS_PER_YEAR,
    0,
    residualPayout,
  );
  const scenarios: Scenario[] = [
    novated,
    mk('cash', 'Cash', retailRunningPerFortnight, carPrice, 0),
    mk(
      'loan',
      'Car loan',
      amortisedRepayment(carPrice, inputs.carLoanRatePercent, fortnights, FORTNIGHTS_PER_YEAR) +
        retailRunningPerFortnight,
      0,
      0,
    ),
    mk(
      'redraw',
      'Mortgage redraw',
      amortisedRepayment(carPrice, inputs.mortgageRatePercent, fortnights, FORTNIGHTS_PER_YEAR) +
        retailRunningPerFortnight,
      0,
      0,
    ),
  ];
  for (const s of scenarios) s.vsLease = s.endOfTermCost - novated.endOfTermCost;

  const alternatives = scenarios.filter((s) => s.key !== 'novated');
  const bestAlternative = alternatives.reduce((a, b) =>
    b.endOfTermCost < a.endOfTermCost ? b : a,
  );
  const leaseVsBest = novated.endOfTermCost - bestAlternative.endOfTermCost;

  return {
    amountFinanced,
    financedIsEstimate,
    gstCreditOnCar,
    gstCreditIsCapped,
    thresholds: t,
    impliedAprPercent,
    impliedGrade,
    totalFinancePayments,
    interestAndFees,
    residualExGst,
    residualGst,
    residualPayout,
    leaseToOwnTotal,
    minResidualPercent,
    minResidualAmount,
    treatment,
    phaseRulesAreAnnouncedOnly,
    notionalTaxableValue,
    rfbaPerYear,
    ecmPerYear,
    ecmGstPerYear,
    lvaPerYear,
    packageCostsPerYear,
    preTaxPerYear,
    baseline,
    withLease,
    taxSavedPerYear,
    takeHomeDropPerYear,
    stslDeltaPerYear,
    mlsDeltaPerYear,
    div293DeltaPerYear,
    retailRunningPerFortnight,
    scenarios,
    bestAlternative,
    novated,
    leaseVsBest,
  };
}
