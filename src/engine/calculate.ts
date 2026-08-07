import type { Bracket, FYData, TaxCategory } from '../data';

export type PayCycle = 'annual' | 'monthly' | 'fortnightly' | 'weekly' | 'daily' | 'hourly';

export interface CalculatorInputs {
  /** amount as entered, interpreted per payCycle */
  salary: number;
  payCycle: PayCycle;
  /** used when payCycle is 'hourly' */
  hoursPerWeek: number;
  /** used when payCycle is 'daily' */
  daysPerWeek: number;
  category: TaxCategory;
  /** entered salary is a package that includes super guarantee */
  salaryIncludesSuper: boolean;
  /** annual salary sacrifice to super (reportable super contribution) */
  salarySacrificeSuper: number;
  /** annual other pre-tax deductions (reduces taxable income only) */
  deductions: number;
  hasStudentLoan: boolean;
  /** appropriate private hospital cover held all year (MLS not payable) */
  privateHospitalCover: boolean;
  /** spouse for MLS family threshold purposes */
  hasSpouse: boolean;
  /** combined spouse income for MLS purposes (tier selection uses family income) */
  spouseIncome: number;
  /** MLS dependent children */
  dependants: number;
  medicareExemption: 'none' | 'half' | 'full';
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  salary: 100_000,
  payCycle: 'annual',
  hoursPerWeek: 38,
  daysPerWeek: 5,
  category: 'resident',
  salaryIncludesSuper: false,
  salarySacrificeSuper: 0,
  deductions: 0,
  hasStudentLoan: false,
  privateHospitalCover: false,
  hasSpouse: false,
  spouseIncome: 0,
  dependants: 0,
  medicareExemption: 'none',
};

export interface BracketLine {
  from: number;
  to: number | null;
  rate: number;
  amount: number;
}

export interface CalculationResult {
  fy: FYData['fy'];
  /** annual cash salary (excluding super) */
  grossSalary: number;
  taxableIncome: number;
  incomeTax: number;
  bracketLines: BracketLine[];
  lito: number;
  /** income tax after non-refundable offsets, floored at 0 */
  netIncomeTax: number;
  medicareLevy: number;
  medicareSurcharge: number;
  mlsTierRate: number;
  studentLoanRepayment: number;
  /** repayment income used for STSL (broader than taxable income) */
  repaymentIncome: number;
  superGuarantee: number;
  superIsCapped: boolean;
  salarySacrificeSuper: number;
  concessionalTotal: number;
  concessionalCap: number;
  overConcessionalCap: boolean;
  div293Income: number;
  div293Payable: number;
  totalTax: number;
  takeHome: number;
}

/** annualise the entered amount */
export function annualSalary(inputs: CalculatorInputs): number {
  const { salary, payCycle, hoursPerWeek, daysPerWeek } = inputs;
  switch (payCycle) {
    case 'annual':
      return salary;
    case 'monthly':
      return salary * 12;
    case 'fortnightly':
      return salary * 26;
    case 'weekly':
      return salary * 52;
    case 'daily':
      return salary * daysPerWeek * 52;
    case 'hourly':
      return salary * hoursPerWeek * 52;
  }
}

export function taxFromBrackets(taxable: number, brackets: Bracket[]): number {
  if (taxable <= 0) return 0;
  let b = brackets[0];
  for (const br of brackets) {
    if (taxable > br.min) b = br;
  }
  return b.base + b.rate * (taxable - b.min);
}

export function bracketBreakdown(taxable: number, brackets: Bracket[]): BracketLine[] {
  const lines: BracketLine[] = [];
  for (let i = 0; i < brackets.length; i++) {
    const br = brackets[i];
    const next = brackets[i + 1];
    if (taxable <= br.min) break;
    const upper = next ? Math.min(taxable, next.min) : taxable;
    const amount = br.rate * (upper - br.min);
    lines.push({ from: br.min, to: next ? next.min : null, rate: br.rate, amount });
  }
  return lines;
}

export function litoAmount(taxable: number, fy: FYData, category: TaxCategory): number {
  // Residents only (both scales withhold the same annual liability)
  if (category === 'foreign' || category === 'whm') return 0;
  const l = fy.lito;
  if (taxable <= l.firstTaperFrom) return l.max;
  if (taxable <= l.secondTaperFrom) return l.max - l.firstTaperRate * (taxable - l.firstTaperFrom);
  if (taxable <= l.cutOut)
    return Math.max(0, l.secondTaperBase - l.secondTaperRate * (taxable - l.secondTaperFrom));
  return 0;
}

export function medicareLevyAmount(
  taxable: number,
  fy: FYData,
  category: TaxCategory,
  exemption: CalculatorInputs['medicareExemption'],
): number {
  // Foreign residents and WHMs are not entitled to Medicare and don't pay the levy
  if (category === 'foreign' || category === 'whm') return 0;
  if (exemption === 'full') return 0;
  const m = fy.medicare;
  let levy: number;
  if (taxable <= m.lowerSingle) levy = 0;
  else if (taxable <= m.upperSingle) levy = m.shadeInRate * (taxable - m.lowerSingle);
  else levy = m.rate * taxable;
  return exemption === 'half' ? levy / 2 : levy;
}

/**
 * MLS: tier selection uses income for MLS purposes (here: taxable + reportable
 * super, plus spouse income when applicable); the surcharge itself is levied on
 * the narrower base (taxable income; we carry no fringe benefits input).
 */
export function medicareSurchargeAmount(args: {
  taxable: number;
  reportableSuper: number;
  fy: FYData;
  category: TaxCategory;
  privateHospitalCover: boolean;
  hasSpouse: boolean;
  spouseIncome: number;
  dependants: number;
}): { amount: number; tierRate: number; mlsIncome: number } {
  const { taxable, reportableSuper, fy, category } = args;
  const mlsIncome = taxable + reportableSuper + (args.hasSpouse ? args.spouseIncome : 0);
  if (category === 'foreign' || category === 'whm' || args.privateHospitalCover) {
    return { amount: 0, tierRate: 0, mlsIncome };
  }
  const isFamily = args.hasSpouse || args.dependants > 0;
  const extraChildren = Math.max(0, args.dependants - 1);
  const uplift = extraChildren * fy.mls.perChildAfterFirst;

  let tierRate = 0;
  for (const t of fy.mls.tiers) {
    const threshold = isFamily ? t.familyFrom + (t.familyFrom > 0 ? uplift : 0) : t.singleFrom;
    if (mlsIncome > threshold) tierRate = t.rate;
  }
  // Levy base: own taxable income (+ own reportable fringe benefits, not modelled)
  const amount = tierRate * taxable;
  return { amount, tierRate, mlsIncome };
}

/**
 * STSL repayment income: taxable income + reportable super contributions
 * (+ fringe benefits and investment losses, not modelled).
 * Salary sacrifice therefore does NOT reduce the repayment base.
 */
export function studentLoanRepayment(
  repaymentIncome: number,
  fy: FYData,
): { amount: number } {
  const s = fy.stsl;
  if (s.kind === 'flat') {
    let rate = 0;
    for (const band of s.bands) {
      if (repaymentIncome >= band.from) rate = band.rate;
    }
    return { amount: rate * repaymentIncome };
  }
  if (repaymentIncome <= s.threshold) return { amount: 0 };
  if (repaymentIncome >= s.topFrom) return { amount: s.topRate * repaymentIncome };
  let band = s.bands[0];
  for (const b of s.bands) {
    if (repaymentIncome > b.over) band = b;
  }
  return { amount: band.base + band.rate * (repaymentIncome - band.over) };
}

export interface SuperResult {
  /** annual cash salary once any packaged super is removed */
  cashSalary: number;
  superGuarantee: number;
  capped: boolean;
}

export function superGuaranteeAmount(annualPackageOrSalary: number, fy: FYData, includesSuper: boolean): SuperResult {
  const r = fy.superRules;
  const rate = r.guaranteeRate;
  const cashSalary = includesSuper
    ? annualPackageOrSalary / (1 + rate)
    : annualPackageOrSalary;
  let sg = cashSalary * rate;
  let capped = false;

  if (r.maxContributionBaseAnnual !== undefined) {
    const maxSg = r.maxContributionBaseAnnual * rate;
    if (sg > maxSg) {
      sg = maxSg;
      capped = true;
    }
  } else if (r.maxContributionBaseQuarterly !== undefined) {
    const maxSg = r.maxContributionBaseQuarterly * 4 * rate;
    if (sg > maxSg) {
      sg = maxSg;
      capped = true;
    }
  }
  return { cashSalary, superGuarantee: sg, capped };
}

export function calculate(inputs: CalculatorInputs, fy: FYData): CalculationResult {
  const annual = annualSalary(inputs);
  const { cashSalary, superGuarantee, capped } = superGuaranteeAmount(
    annual,
    fy,
    inputs.salaryIncludesSuper,
  );

  const sacrifice = Math.max(0, Math.min(inputs.salarySacrificeSuper, cashSalary));
  const deductions = Math.max(0, inputs.deductions);
  const taxableIncome = Math.max(0, cashSalary - sacrifice - deductions);

  const brackets =
    inputs.category === 'foreign'
      ? fy.foreignBrackets
      : inputs.category === 'whm'
        ? fy.whmBrackets
        : fy.residentBrackets;

  const incomeTax = taxFromBrackets(taxableIncome, brackets);
  const bracketLines = bracketBreakdown(taxableIncome, brackets);
  const lito = litoAmount(taxableIncome, fy, inputs.category);
  const netIncomeTax = Math.max(0, incomeTax - lito);

  const medicareLevy = medicareLevyAmount(taxableIncome, fy, inputs.category, inputs.medicareExemption);

  const mls = medicareSurchargeAmount({
    taxable: taxableIncome,
    reportableSuper: sacrifice,
    fy,
    category: inputs.category,
    privateHospitalCover: inputs.privateHospitalCover,
    hasSpouse: inputs.hasSpouse,
    spouseIncome: inputs.spouseIncome,
    dependants: inputs.dependants,
  });

  const repaymentIncome = taxableIncome + sacrifice;
  const stsl = inputs.hasStudentLoan
    ? studentLoanRepayment(repaymentIncome, fy)
    : { amount: 0 };

  const concessionalTotal = superGuarantee + sacrifice;
  const div293Income = taxableIncome + concessionalTotal;
  const div293Excess = Math.max(0, div293Income - fy.div293.threshold);
  const div293Payable =
    div293Excess > 0 ? fy.div293.rate * Math.min(div293Excess, concessionalTotal) : 0;

  const totalTax = netIncomeTax + medicareLevy + mls.amount + stsl.amount;
  const takeHome = cashSalary - sacrifice - totalTax;

  return {
    fy: fy.fy,
    grossSalary: cashSalary,
    taxableIncome,
    incomeTax,
    bracketLines,
    lito,
    netIncomeTax,
    medicareLevy,
    medicareSurcharge: mls.amount,
    mlsTierRate: mls.tierRate,
    studentLoanRepayment: stsl.amount,
    repaymentIncome,
    superGuarantee,
    superIsCapped: capped,
    salarySacrificeSuper: sacrifice,
    concessionalTotal,
    concessionalCap: fy.superRules.concessionalCap,
    overConcessionalCap: concessionalTotal > fy.superRules.concessionalCap,
    div293Income,
    div293Payable,
    totalTax,
    takeHome,
  };
}
