import { describe, it, expect } from 'vitest';
import { FY_DATA, FINANCIAL_YEARS, currentFinancialYear } from './index';

describe('FY data registry', () => {
  it('every listed year has data tagged with its own FY', () => {
    for (const fy of FINANCIAL_YEARS) {
      expect(FY_DATA[fy].fy).toBe(fy);
    }
  });
});

describe('currentFinancialYear', () => {
  it('rolls over on 1 July', () => {
    // local-time constructors: the FY boundary is read off getMonth()
    expect(currentFinancialYear(new Date(2025, 5, 30))).toBe('2024-25');
    expect(currentFinancialYear(new Date(2025, 6, 1))).toBe('2025-26');
  });

  it('falls back to the latest year we hold data for', () => {
    const latest = FINANCIAL_YEARS[FINANCIAL_YEARS.length - 1];
    expect(currentFinancialYear(new Date(2040, 8, 1))).toBe(latest);
    expect(currentFinancialYear(new Date(2001, 0, 1))).toBe(latest);
  });
});
