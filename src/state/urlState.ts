import type { FinancialYear, TaxCategory } from '../data';
import { FINANCIAL_YEARS } from '../data';
import type { CalculatorInputs, PayCycle } from '../engine/calculate';
import { DEFAULT_INPUTS } from '../engine/calculate';
import type { AuState, CompareInputs } from '../engine/compare';
import { AU_STATES, DEFAULT_COMPARE } from '../engine/compare';
import type { InterestOption, MortgageInputs, RepaymentFrequency } from '../engine/mortgage';
import { defaultMortgage } from '../engine/mortgage';
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

export type Mode = 'salary' | 'compare' | 'mortgage';

const INTEREST_OPTIONS: InterestOption[] = [
  'variable', 'fixed6m', 'fixed1y', 'fixed2y', 'fixed3y', 'fixed5y', 'fixedFull', 'interestOnly',
];
const MORTGAGE_FREQS: RepaymentFrequency[] = ['monthly', 'fortnightly', 'weekly'];

export interface UrlState {
  mode: Mode;
  inputs: CalculatorInputs;
  compare: CompareInputs;
  mortgage: MortgageInputs;
  fy: FinancialYear;
  view: ViewPeriod;
}

function num(v: string | null, fallback: number, max = 100_000_000): number {
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : fallback;
}

export function parseUrlState(search: string, defaultFy: FinancialYear): UrlState {
  const p = new URLSearchParams(search);
  const d = DEFAULT_INPUTS;

  const cycle = p.get('c');
  const cat = p.get('cat');
  const fyParam = p.get('fy');
  const mex = p.get('mex');
  const view = p.get('v');
  const dc = DEFAULT_COMPARE;

  const dm = defaultMortgage(new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear());
  const opt = (v: string | null, fallback: InterestOption): InterestOption =>
    INTEREST_OPTIONS.includes(v as InterestOption) ? (v as InterestOption) : fallback;

  return {
    mode: p.get('mode') === 'c' ? 'compare' : p.get('mode') === 'm' ? 'mortgage' : 'salary',
    mortgage: {
      dutyState: AU_STATES.includes(p.get('mst') as AuState)
        ? (p.get('mst') as AuState)
        : dm.dutyState,
      existing: p.get('mex2') === '1',
      startYear: num(p.get('msy'), dm.startYear, 2100),
      startMonth: num(p.get('msm'), dm.startMonth, 12),
      propertyValue: num(p.get('mpv'), dm.propertyValue),
      deposit: num(p.get('mdep'), dm.deposit),
      upfrontFees: num(p.get('mfee'), dm.upfrontFees),
      termYears: num(p.get('mtm'), dm.termYears, 40),
      frequency: MORTGAGE_FREQS.includes(p.get('mfq') as RepaymentFrequency)
        ? (p.get('mfq') as RepaymentFrequency)
        : dm.frequency,
      portions: [
        {
          amount: num(p.get('ma1'), dm.portions[0].amount),
          ratePercent: num(p.get('mr1'), dm.portions[0].ratePercent, 25),
          option: opt(p.get('mo1'), dm.portions[0].option),
          interestOnlyYears: num(p.get('mio1'), dm.portions[0].interestOnlyYears, 15),
        },
        {
          amount: num(p.get('ma2'), dm.portions[1].amount),
          ratePercent: num(p.get('mr2'), dm.portions[1].ratePercent, 25),
          option: opt(p.get('mo2'), dm.portions[1].option),
          interestOnlyYears: num(p.get('mio2'), dm.portions[1].interestOnlyYears, 15),
        },
      ],
      split: p.get('msp') === '1',
      extraPerPeriod: num(p.get('mxr'), dm.extraPerPeriod),
      rateForecast: {
        nearYear: num(p.get('mrny'), dm.rateForecast.nearYear, 2100),
        nearPercent: num(p.get('mrnp'), dm.rateForecast.nearPercent, 25),
        longYear: num(p.get('mrly'), dm.rateForecast.longYear, 2100),
        longPercent: num(p.get('mrlp'), dm.rateForecast.longPercent, 25),
      },
      growthForecast: {
        nearYear: num(p.get('mgny'), dm.growthForecast.nearYear, 2100),
        nearPercent: num(p.get('mgnp'), dm.growthForecast.nearPercent, 25),
        longYear: num(p.get('mgly'), dm.growthForecast.longYear, 2100),
        longPercent: num(p.get('mglp'), dm.growthForecast.longPercent, 25),
      },
    },
    view: VIEWS.includes(view as ViewPeriod) ? (view as ViewPeriod) : DEFAULT_VIEW,
    fy: FINANCIAL_YEARS.includes(fyParam as FinancialYear)
      ? (fyParam as FinancialYear)
      : defaultFy,
    compare: {
      state: AU_STATES.includes(p.get('st') as AuState) ? (p.get('st') as AuState) : dc.state,
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
      payCycle: CYCLES.includes(cycle as PayCycle) ? (cycle as PayCycle) : d.payCycle,
      hoursPerWeek: num(p.get('h'), d.hoursPerWeek, 168),
      daysPerWeek: num(p.get('d'), d.daysPerWeek, 7),
      category: CATEGORIES.includes(cat as TaxCategory) ? (cat as TaxCategory) : d.category,
      salaryIncludesSuper: p.get('inc') === '1',
      salarySacrificeSuper: num(p.get('ss'), d.salarySacrificeSuper),
      deductions: num(p.get('ded'), d.deductions),
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
  const { inputs: i, fy, compare: c, mortgage: m } = state;
  const d = DEFAULT_INPUTS;
  const dc = DEFAULT_COMPARE;
  const dm = defaultMortgage(m.startYear && !m.existing ? m.startYear : new Date().getFullYear());

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
    const df = dm.rateForecast;
    if (m.rateForecast.nearYear !== df.nearYear) p.set('mrny', String(m.rateForecast.nearYear));
    if (m.rateForecast.nearPercent !== df.nearPercent) p.set('mrnp', String(m.rateForecast.nearPercent));
    if (m.rateForecast.longYear !== df.longYear) p.set('mrly', String(m.rateForecast.longYear));
    if (m.rateForecast.longPercent !== df.longPercent) p.set('mrlp', String(m.rateForecast.longPercent));
    const dg = dm.growthForecast;
    if (m.growthForecast.nearYear !== dg.nearYear) p.set('mgny', String(m.growthForecast.nearYear));
    if (m.growthForecast.nearPercent !== dg.nearPercent) p.set('mgnp', String(m.growthForecast.nearPercent));
    if (m.growthForecast.longYear !== dg.longYear) p.set('mgly', String(m.growthForecast.longYear));
    if (m.growthForecast.longPercent !== dg.longPercent) p.set('mglp', String(m.growthForecast.longPercent));
    const mq = p.toString();
    return mq ? `?${mq}` : '';
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
    const cq = p.toString();
    return cq ? `?${cq}` : '';
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
  if (i.hasStudentLoan) p.set('sl', '1');
  if (i.privateHospitalCover) p.set('phc', '1');
  if (i.hasSpouse) p.set('sp', '1');
  if (i.spouseIncome > 0) p.set('si', String(i.spouseIncome));
  if (i.dependants > 0) p.set('dep', String(i.dependants));
  if (i.medicareExemption !== 'none') p.set('mex', i.medicareExemption);

  const q = p.toString();
  return q ? `?${q}` : '';
}

export function syncUrl(state: UrlState, defaultFy: FinancialYear): void {
  const next = serialiseUrlState(state, defaultFy);
  const current = window.location.search;
  if (next !== current) {
    window.history.replaceState(null, '', `${window.location.pathname}${next}`);
  }
}
