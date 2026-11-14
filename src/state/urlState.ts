import type { FinancialYear, TaxCategory } from '../data';
import { FINANCIAL_YEARS } from '../data';
import type { CalculatorInputs, PayCycle } from '../engine/calculate';
import { DEFAULT_INPUTS } from '../engine/calculate';
import type { CompareInputs } from '../engine/compare';
import { AU_STATES, DEFAULT_COMPARE } from '../engine/compare';
import type {
  Forecast,
  InterestOption,
  LoanPortion,
  MortgageInputs,
  RepaymentFrequency,
} from '../engine/mortgage';
import { defaultMortgage } from '../engine/mortgage';
import type { NovatedLeaseInputs } from '../engine/novatedLease';
import { defaultNovated } from '../engine/novatedLease';
import type { VehicleType } from '../data/fbt';
import type { ViewPeriod } from '../components/view';

/**
 * The URL is the app's state container: every input round-trips through the
 * query string so any result can be bookmarked or shared. Defaults are
 * omitted to keep URLs short.
 */

const CYCLES: PayCycle[] = ['annual', 'monthly', 'fortnightly', 'weekly', 'daily', 'hourly'];
const CATEGORIES: TaxCategory[] = ['resident', 'residentNoTFT', 'foreign', 'whm'];
const VIEWS: ViewPeriod[] = ['weekly', 'fortnightly', 'monthly', 'annually'];

export const DEFAULT_VIEW: ViewPeriod = 'monthly';

export type Mode = 'salary' | 'compare' | 'mortgage' | 'novated';

const VEHICLE_TYPES: VehicleType[] = ['bev', 'ice'];

const INTEREST_OPTIONS: InterestOption[] = [
  'variable',
  'fixed6m',
  'fixed1y',
  'fixed2y',
  'fixed3y',
  'fixed5y',
  'fixedFull',
  'interestOnly',
];
const MORTGAGE_FREQS: RepaymentFrequency[] = ['monthly', 'fortnightly', 'weekly'];

export interface UrlState {
  mode: Mode;
  inputs: CalculatorInputs;
  compare: CompareInputs;
  mortgage: MortgageInputs;
  novated: NovatedLeaseInputs;
  fy: FinancialYear;
  view: ViewPeriod;
}

function num(v: string | null, fallback: number, max = 100_000_000): number {
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : fallback;
}

function oneOf<T extends string>(allowed: readonly T[], v: string | null, fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

// forecast params: mrny, mrnp, mrly, mrlp (rates) and mgny, mgnp, mgly, mglp (growth)
function parseForecast(p: URLSearchParams, prefix: 'mr' | 'mg', d: Forecast): Forecast {
  return {
    nearYear: num(p.get(`${prefix}ny`), d.nearYear, 2100),
    nearPercent: num(p.get(`${prefix}np`), d.nearPercent, 25),
    longYear: num(p.get(`${prefix}ly`), d.longYear, 2100),
    longPercent: num(p.get(`${prefix}lp`), d.longPercent, 25),
  };
}

function setForecast(p: URLSearchParams, prefix: 'mr' | 'mg', f: Forecast, d: Forecast): void {
  if (f.nearYear !== d.nearYear) p.set(`${prefix}ny`, String(f.nearYear));
  if (f.nearPercent !== d.nearPercent) p.set(`${prefix}np`, String(f.nearPercent));
  if (f.longYear !== d.longYear) p.set(`${prefix}ly`, String(f.longYear));
  if (f.longPercent !== d.longPercent) p.set(`${prefix}lp`, String(f.longPercent));
}

function toSearch(p: URLSearchParams): string {
  const q = p.toString();
  return q ? `?${q}` : '';
}

export function parseUrlState(search: string, defaultFy: FinancialYear): UrlState {
  const p = new URLSearchParams(search);
  const d = DEFAULT_INPUTS;

  const modeParam = p.get('mode');
  const nvt = p.get('nvt');
  const mex = p.get('mex');
  const dc = DEFAULT_COMPARE;

  const dm = defaultMortgage(new Date().getFullYear());
  // loan portion params: ma1, mr1, mo1, mio1 and ma2, mr2, mo2, mio2
  const portion = (n: 1 | 2, dp: LoanPortion): LoanPortion => ({
    amount: num(p.get(`ma${n}`), dp.amount),
    ratePercent: num(p.get(`mr${n}`), dp.ratePercent, 25),
    option: oneOf(INTEREST_OPTIONS, p.get(`mo${n}`), dp.option),
    interestOnlyYears: num(p.get(`mio${n}`), dp.interestOnlyYears, 15),
  });

  const dn = defaultNovated(new Date());

  return {
    mode:
      modeParam === 'c'
        ? 'compare'
        : modeParam === 'm'
          ? 'mortgage'
          : modeParam === 'n'
            ? 'novated'
            : 'salary',
    novated: {
      // legacy URLs may carry nvt=phev: treat as petrol (exemption ended Apr 2025)
      vehicleType: nvt === 'phev' ? 'ice' : oneOf(VEHICLE_TYPES, nvt, dn.vehicleType),
      carPrice: num(p.get('np'), dn.carPrice),
      fbtBaseValue: num(p.get('nbv'), dn.fbtBaseValue),
      amountFinanced: num(p.get('naf'), dn.amountFinanced),
      financePerFortnight: num(p.get('npf'), dn.financePerFortnight),
      runningPerFortnight: num(p.get('nrc'), dn.runningPerFortnight),
      termYears: num(p.get('ntm'), dn.termYears, 5),
      residual: num(p.get('nrv'), dn.residual),
      residualIncludesGst: p.get('nrvg') === '1',
      startYear: num(p.get('nsy'), dn.startYear, 2100),
      startMonth: num(p.get('nsm'), dn.startMonth, 12),
      lvaPassedOn: p.get('nlva') !== '0',
      salary: num(p.get('ns'), dn.salary),
      hasStudentLoan: p.get('nsl') === '1',
      privateHospitalCover: p.get('nphc') === '1',
      carLoanRatePercent: num(p.get('nclr'), dn.carLoanRatePercent, 30),
      mortgageRatePercent: num(p.get('nmr'), dn.mortgageRatePercent, 25),
    },
    mortgage: {
      dutyState: oneOf(AU_STATES, p.get('mst'), dm.dutyState),
      existing: p.get('mex2') === '1',
      startYear: num(p.get('msy'), dm.startYear, 2100),
      startMonth: num(p.get('msm'), dm.startMonth, 12),
      propertyValue: num(p.get('mpv'), dm.propertyValue),
      deposit: num(p.get('mdep'), dm.deposit),
      upfrontFees: num(p.get('mfee'), dm.upfrontFees),
      termYears: num(p.get('mtm'), dm.termYears, 40),
      frequency: oneOf(MORTGAGE_FREQS, p.get('mfq'), dm.frequency),
      portions: [portion(1, dm.portions[0]), portion(2, dm.portions[1])],
      split: p.get('msp') === '1',
      extraPerPeriod: num(p.get('mxr'), dm.extraPerPeriod),
      rateForecast: parseForecast(p, 'mr', dm.rateForecast),
      growthForecast: parseForecast(p, 'mg', dm.growthForecast),
    },
    view: oneOf(VIEWS, p.get('v'), DEFAULT_VIEW),
    fy: oneOf(FINANCIAL_YEARS, p.get('fy'), defaultFy),
    compare: {
      state: oneOf(AU_STATES, p.get('st'), dc.state),
      publicHolidayDays: num(p.get('ph'), dc.publicHolidayDays, 366),
      annualLeaveDays: num(p.get('al'), dc.annualLeaveDays, 366),
      sickDays: num(p.get('sd'), dc.sickDays, 366),
      workDaysPerYear: num(p.get('wd'), dc.workDaysPerYear, 366),
      hoursPerDay: num(p.get('hpd'), dc.hoursPerDay, 24),
      hasStudentLoan: p.get('csl') === '1',
      privateHospitalCover: p.get('cphc') === '1',
      contractRate: num(p.get('cr'), dc.contractRate),
      contractTimeUnit: p.get('cu') === 'h' ? 'hourly' : 'daily',
      contractIncludesSuper: p.get('cis') === '1',
      contractSuperPercent: num(p.get('csp'), dc.contractSuperPercent, 30),
      permSalary: num(p.get('ps'), dc.permSalary),
      permBonus: num(p.get('pb'), dc.permBonus),
      permIncludesSuper: p.get('pis') === '1',
      permSuperPercent: num(p.get('psp'), dc.permSuperPercent, 30),
    },
    inputs: {
      salary: num(p.get('s'), d.salary),
      payCycle: oneOf(CYCLES, p.get('c'), d.payCycle),
      hoursPerWeek: num(p.get('h'), d.hoursPerWeek, 168),
      daysPerWeek: num(p.get('d'), d.daysPerWeek, 7),
      category: oneOf(CATEGORIES, p.get('cat'), d.category),
      salaryIncludesSuper: p.get('inc') === '1',
      salarySacrificeSuper: num(p.get('ss'), d.salarySacrificeSuper),
      deductions: num(p.get('ded'), d.deductions),
      reportableFringeBenefits: num(p.get('rfb'), d.reportableFringeBenefits ?? 0),
      hasStudentLoan: p.get('sl') === '1',
      privateHospitalCover: p.get('phc') === '1',
      hasSpouse: p.get('sp') === '1',
      spouseIncome: num(p.get('si'), d.spouseIncome),
      dependants: num(p.get('dep'), d.dependants, 20),
      medicareExemption: mex === 'half' || mex === 'full' ? mex : 'none',
    },
  };
}

export function serialiseUrlState(state: UrlState, defaultFy: FinancialYear): string {
  const p = new URLSearchParams();
  const { inputs: i, fy, compare: c, mortgage: m, novated: n } = state;
  const d = DEFAULT_INPUTS;
  const dc = DEFAULT_COMPARE;
  const dm = defaultMortgage(m.startYear && !m.existing ? m.startYear : new Date().getFullYear());

  if (state.mode === 'novated') {
    const dn = defaultNovated(new Date());
    p.set('mode', 'n');
    if (n.vehicleType !== dn.vehicleType) p.set('nvt', n.vehicleType);
    if (n.carPrice !== dn.carPrice) p.set('np', String(n.carPrice));
    if (n.fbtBaseValue > 0) p.set('nbv', String(n.fbtBaseValue));
    if (n.amountFinanced > 0) p.set('naf', String(n.amountFinanced));
    if (n.financePerFortnight !== dn.financePerFortnight)
      p.set('npf', String(n.financePerFortnight));
    if (n.runningPerFortnight !== dn.runningPerFortnight)
      p.set('nrc', String(n.runningPerFortnight));
    if (n.termYears !== dn.termYears) p.set('ntm', String(n.termYears));
    if (n.residual !== dn.residual) p.set('nrv', String(n.residual));
    if (n.residualIncludesGst) p.set('nrvg', '1');
    if (n.startYear !== dn.startYear) p.set('nsy', String(n.startYear));
    if (n.startMonth !== dn.startMonth) p.set('nsm', String(n.startMonth));
    if (!n.lvaPassedOn) p.set('nlva', '0');
    if (n.salary !== dn.salary) p.set('ns', String(n.salary));
    if (n.hasStudentLoan) p.set('nsl', '1');
    if (n.privateHospitalCover) p.set('nphc', '1');
    if (n.carLoanRatePercent !== dn.carLoanRatePercent) p.set('nclr', String(n.carLoanRatePercent));
    if (n.mortgageRatePercent !== dn.mortgageRatePercent)
      p.set('nmr', String(n.mortgageRatePercent));
    if (fy !== defaultFy) p.set('fy', fy);
    return toSearch(p);
  }

  if (state.mode === 'mortgage') {
    p.set('mode', 'm');
    if (m.dutyState !== dm.dutyState) p.set('mst', m.dutyState);
    if (m.existing) p.set('mex2', '1');
    if (m.existing && m.startYear !== dm.startYear) p.set('msy', String(m.startYear));
    if (m.existing && m.startMonth !== dm.startMonth) p.set('msm', String(m.startMonth));
    if (m.propertyValue !== dm.propertyValue) p.set('mpv', String(m.propertyValue));
    if (m.deposit !== dm.deposit) p.set('mdep', String(m.deposit));
    if (m.upfrontFees > 0) p.set('mfee', String(m.upfrontFees));
    if (m.termYears !== dm.termYears) p.set('mtm', String(m.termYears));
    if (m.frequency !== dm.frequency) p.set('mfq', m.frequency);
    if (m.portions[0].amount !== dm.portions[0].amount) p.set('ma1', String(m.portions[0].amount));
    if (m.portions[0].ratePercent !== dm.portions[0].ratePercent)
      p.set('mr1', String(m.portions[0].ratePercent));
    if (m.portions[0].option !== 'variable') p.set('mo1', m.portions[0].option);
    if (m.portions[0].interestOnlyYears > 0) p.set('mio1', String(m.portions[0].interestOnlyYears));
    if (m.split) {
      p.set('msp', '1');
      if (m.portions[1].amount > 0) p.set('ma2', String(m.portions[1].amount));
      if (m.portions[1].ratePercent !== dm.portions[1].ratePercent)
        p.set('mr2', String(m.portions[1].ratePercent));
      if (m.portions[1].option !== dm.portions[1].option) p.set('mo2', m.portions[1].option);
      if (m.portions[1].interestOnlyYears > 0)
        p.set('mio2', String(m.portions[1].interestOnlyYears));
    }
    if (m.extraPerPeriod > 0) p.set('mxr', String(m.extraPerPeriod));
    setForecast(p, 'mr', m.rateForecast, dm.rateForecast);
    setForecast(p, 'mg', m.growthForecast, dm.growthForecast);
    return toSearch(p);
  }

  if (state.mode === 'compare') {
    p.set('mode', 'c');
    if (c.contractRate !== dc.contractRate) p.set('cr', String(c.contractRate));
    if (c.contractTimeUnit === 'hourly') p.set('cu', 'h');
    if (c.contractIncludesSuper) p.set('cis', '1');
    if (c.contractSuperPercent !== dc.contractSuperPercent)
      p.set('csp', String(c.contractSuperPercent));
    if (c.permSalary !== dc.permSalary) p.set('ps', String(c.permSalary));
    if (c.permBonus !== dc.permBonus) p.set('pb', String(c.permBonus));
    if (c.permIncludesSuper) p.set('pis', '1');
    if (c.permSuperPercent !== dc.permSuperPercent) p.set('psp', String(c.permSuperPercent));
    if (c.state !== dc.state) p.set('st', c.state);
    if (c.publicHolidayDays !== dc.publicHolidayDays) p.set('ph', String(c.publicHolidayDays));
    if (c.annualLeaveDays !== dc.annualLeaveDays) p.set('al', String(c.annualLeaveDays));
    if (c.sickDays !== dc.sickDays) p.set('sd', String(c.sickDays));
    if (c.workDaysPerYear !== dc.workDaysPerYear) p.set('wd', String(c.workDaysPerYear));
    if (c.hoursPerDay !== dc.hoursPerDay) p.set('hpd', String(c.hoursPerDay));
    if (c.hasStudentLoan) p.set('csl', '1');
    if (c.privateHospitalCover) p.set('cphc', '1');
    if (fy !== defaultFy) p.set('fy', fy);
    return toSearch(p);
  }

  if (state.view !== DEFAULT_VIEW) p.set('v', state.view);
  if (i.salary !== d.salary) p.set('s', String(i.salary));
  if (i.payCycle !== d.payCycle) p.set('c', i.payCycle);
  if (i.hoursPerWeek !== d.hoursPerWeek) p.set('h', String(i.hoursPerWeek));
  if (i.daysPerWeek !== d.daysPerWeek) p.set('d', String(i.daysPerWeek));
  if (fy !== defaultFy) p.set('fy', fy);
  if (i.category !== d.category) p.set('cat', i.category);
  if (i.salaryIncludesSuper) p.set('inc', '1');
  if (i.salarySacrificeSuper > 0) p.set('ss', String(i.salarySacrificeSuper));
  if (i.deductions > 0) p.set('ded', String(i.deductions));
  if ((i.reportableFringeBenefits ?? 0) > 0) p.set('rfb', String(i.reportableFringeBenefits));
  if (i.hasStudentLoan) p.set('sl', '1');
  if (i.privateHospitalCover) p.set('phc', '1');
  if (i.hasSpouse) p.set('sp', '1');
  if (i.spouseIncome > 0) p.set('si', String(i.spouseIncome));
  if (i.dependants > 0) p.set('dep', String(i.dependants));
  if (i.medicareExemption !== 'none') p.set('mex', i.medicareExemption);

  return toSearch(p);
}

export function syncUrl(state: UrlState, defaultFy: FinancialYear): void {
  const next = serialiseUrlState(state, defaultFy);
  const current = window.location.search;
  if (next !== current) {
    window.history.replaceState(null, '', `${window.location.pathname}${next}`);
  }
}
