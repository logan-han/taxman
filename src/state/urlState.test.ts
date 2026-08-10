import { describe, it, expect } from 'vitest';
import { parseUrlState, serialiseUrlState, DEFAULT_VIEW } from './urlState';
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
});
