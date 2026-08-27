import { describe, it, expect } from 'vitest';
import { parseUrlState, serialiseUrlState, syncUrl, DEFAULT_VIEW } from './urlState';
import { DEFAULT_INPUTS } from '../engine/calculate';
import { DEFAULT_COMPARE } from '../engine/compare';
import { defaultMortgage } from '../engine/mortgage';
import { defaultNovated } from '../engine/novatedLease';

const BASE = {
  mode: 'salary' as const,
  compare: DEFAULT_COMPARE,
  mortgage: defaultMortgage(2026),
  novated: defaultNovated(new Date()),
};

describe('URL state', () => {
  it('defaults produce an empty query string', () => {
    const q = serialiseUrlState(
      { ...BASE, inputs: DEFAULT_INPUTS, fy: '2026-27', view: DEFAULT_VIEW },
      '2026-27',
    );
    expect(q).toBe('');
  });

  it('round-trips every non-default input', () => {
    const state = {
      ...BASE,
      fy: '2024-25' as const,
      view: 'weekly' as const,
      inputs: {
        ...DEFAULT_INPUTS,
        salary: 87_500,
        payCycle: 'fortnightly' as const,
        category: 'whm' as const,
        salaryIncludesSuper: true,
        salarySacrificeSuper: 5_000,
        deductions: 1_200,
        hasStudentLoan: true,
        privateHospitalCover: true,
        hasSpouse: true,
        spouseIncome: 60_000,
        dependants: 2,
        medicareExemption: 'half' as const,
      },
    };
    const q = serialiseUrlState(state, '2026-27');
    const parsed = parseUrlState(q, '2026-27');
    expect(parsed).toEqual(state);
  });

  it('rejects junk values and falls back to defaults', () => {
    const parsed = parseUrlState('?s=-5&c=hacker&fy=1999-00&dep=999&mex=lol&v=daily', '2026-27');
    expect(parsed.inputs.salary).toBe(DEFAULT_INPUTS.salary);
    expect(parsed.inputs.payCycle).toBe('annual');
    expect(parsed.fy).toBe('2026-27');
    expect(parsed.inputs.dependants).toBe(0);
    expect(parsed.inputs.medicareExemption).toBe('none');
    expect(parsed.view).toBe(DEFAULT_VIEW);
  });

  it('parses a hand-written share URL', () => {
    const parsed = parseUrlState('?s=90000&sl=1&fy=2025-26', '2026-27');
    expect(parsed.inputs.salary).toBe(90_000);
    expect(parsed.inputs.hasStudentLoan).toBe(true);
    expect(parsed.fy).toBe('2025-26');
  });

  it('round-trips comparison mode state', () => {
    const state = {
      mode: 'compare' as const,
      fy: '2026-27' as const,
      view: DEFAULT_VIEW,
      inputs: DEFAULT_INPUTS,
      mortgage: defaultMortgage(2026),
      novated: defaultNovated(new Date()),
      compare: {
        ...DEFAULT_COMPARE,
        contractRate: 850,
        contractTimeUnit: 'hourly' as const,
        contractIncludesSuper: true,
        permSalary: 145_000,
        permBonus: 10_000,
        publicHolidayDays: 11,
        hasStudentLoan: true,
      },
    };
    const q = serialiseUrlState(state, '2026-27');
    expect(q).toContain('mode=c');
    const parsed = parseUrlState(q, '2026-27');
    expect(parsed.mode).toBe('compare');
    expect(parsed.compare).toEqual(state.compare);
  });

  it('compare mode with defaults keeps the URL short', () => {
    const q = serialiseUrlState(
      { ...BASE, mode: 'compare', inputs: DEFAULT_INPUTS, fy: '2026-27', view: DEFAULT_VIEW },
      '2026-27',
    );
    expect(q).toBe('?mode=c');
  });

  it('novated mode with defaults keeps the URL short', () => {
    const q = serialiseUrlState(
      { ...BASE, mode: 'novated', inputs: DEFAULT_INPUTS, fy: '2026-27', view: DEFAULT_VIEW },
      '2026-27',
    );
    expect(q).toBe('?mode=n');
  });

  it('round-trips novated lease state', () => {
    const state = {
      ...BASE,
      mode: 'novated' as const,
      fy: '2026-27' as const,
      view: DEFAULT_VIEW,
      inputs: DEFAULT_INPUTS,
      novated: {
        ...defaultNovated(new Date()),
        vehicleType: 'ice' as const,
        carPrice: 55_000,
        fbtBaseValue: 52_000,
        amountFinanced: 51_000,
        financePerFortnight: 512.4,
        runningPerFortnight: 210.55,
        termYears: 3,
        residual: 25_000,
        residualIncludesGst: true,
        startYear: 2027,
        startMonth: 4,
        lvaPassedOn: false,
        salary: 145_000,
        hasStudentLoan: true,
        privateHospitalCover: true,
        carLoanRatePercent: 6.5,
        mortgageRatePercent: 5.5,
      },
    };
    const q = serialiseUrlState(state, '2026-27');
    expect(q).toContain('mode=n');
    const parsed = parseUrlState(q, '2026-27');
    expect(parsed.mode).toBe('novated');
    expect(parsed.novated).toEqual(state.novated);
  });

  it('legacy nvt=phev URLs fall back to petrol treatment', () => {
    // the PHEV exemption ended April 2025, so old shared links must not claim it
    expect(parseUrlState('?mode=n&nvt=phev', '2026-27').novated.vehicleType).toBe('ice');
    expect(parseUrlState('?mode=n&nvt=junk', '2026-27').novated.vehicleType).toBe('bev');
  });

  it('mortgage mode with defaults keeps the URL short', () => {
    const q = serialiseUrlState(
      { ...BASE, mode: 'mortgage', inputs: DEFAULT_INPUTS, fy: '2026-27', view: DEFAULT_VIEW },
      '2026-27',
    );
    expect(q).toBe('?mode=m');
  });

  it('round-trips a split existing-loan mortgage', () => {
    const thisYear = new Date().getFullYear();
    const mortgage = {
      ...defaultMortgage(thisYear),
      dutyState: 'VIC' as const,
      existing: true,
      startYear: 2019,
      startMonth: 3,
      propertyValue: 1_200_000,
      deposit: 300_000,
      upfrontFees: 55_000,
      termYears: 25,
      frequency: 'fortnightly' as const,
      portions: [
        { amount: 700_000, ratePercent: 5.75, option: 'fixed3y' as const, interestOnlyYears: 2 },
        {
          amount: 200_000,
          ratePercent: 6.25,
          option: 'interestOnly' as const,
          interestOnlyYears: 1,
        },
      ] as (typeof BASE)['mortgage']['portions'],
      split: true,
      extraPerPeriod: 250,
      rateForecast: {
        nearYear: thisYear + 2,
        nearPercent: 5,
        longYear: thisYear + 10,
        longPercent: 5.5,
      },
      growthForecast: {
        nearYear: thisYear + 5,
        nearPercent: 3,
        longYear: thisYear + 15,
        longPercent: 3.5,
      },
    };
    const q = serialiseUrlState(
      {
        ...BASE,
        mode: 'mortgage',
        mortgage,
        inputs: DEFAULT_INPUTS,
        fy: '2026-27',
        view: DEFAULT_VIEW,
      },
      '2026-27',
    );
    expect(q).toContain('mode=m');
    expect(parseUrlState(q, '2026-27').mortgage).toEqual(mortgage);
  });

  it('clamps out-of-range mortgage numbers to the defaults', () => {
    const parsed = parseUrlState('?mode=m&mtm=99&mr1=999&mst=QQ&mfq=daily&mo1=nope', '2026-27');
    const dm = defaultMortgage(new Date().getFullYear());
    expect(parsed.mortgage.termYears).toBe(dm.termYears);
    expect(parsed.mortgage.portions[0].ratePercent).toBe(dm.portions[0].ratePercent);
    expect(parsed.mortgage.dutyState).toBe(dm.dutyState);
    expect(parsed.mortgage.frequency).toBe(dm.frequency);
    expect(parsed.mortgage.portions[0].option).toBe(dm.portions[0].option);
  });
});

describe('syncUrl', () => {
  it('writes the serialised state to the address bar', () => {
    window.history.replaceState(null, '', '/');
    syncUrl(
      {
        ...BASE,
        inputs: { ...DEFAULT_INPUTS, salary: 123_000 },
        fy: '2026-27',
        view: DEFAULT_VIEW,
      },
      '2026-27',
    );
    expect(window.location.search).toBe('?s=123000');
  });

  it('leaves the URL alone when nothing changed', () => {
    window.history.replaceState(null, '', '/?s=123000');
    const before = window.history.length;
    syncUrl(
      {
        ...BASE,
        inputs: { ...DEFAULT_INPUTS, salary: 123_000 },
        fy: '2026-27',
        view: DEFAULT_VIEW,
      },
      '2026-27',
    );
    expect(window.location.search).toBe('?s=123000');
    expect(window.history.length).toBe(before);
  });

  it('clears the query string when everything is back to default', () => {
    window.history.replaceState(null, '', '/?s=123000');
    syncUrl({ ...BASE, inputs: DEFAULT_INPUTS, fy: '2026-27', view: DEFAULT_VIEW }, '2026-27');
    expect(window.location.search).toBe('');
  });
});
