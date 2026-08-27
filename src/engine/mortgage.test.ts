import { describe, it, expect } from 'vitest';
import { amortisedRepayment, calculateMortgage, defaultMortgage, rateAt } from './mortgage';
import type { MortgageInputs } from './mortgage';

const base = (): MortgageInputs => defaultMortgage(2026);

describe('amortisation formula', () => {
  it('textbook fixture: $800k at 6% over 30 years monthly = $4,796.40', () => {
    // P*r/(1-(1+r)^-n), r = 0.005, n = 360
    expect(amortisedRepayment(800_000, 6, 360, 12)).toBeCloseTo(4_796.4, 1);
  });

  it('zero rate divides evenly', () => {
    expect(amortisedRepayment(120_000, 0, 120, 12)).toBeCloseTo(1_000, 6);
  });
});

describe('rate curve', () => {
  it('interpolates start -> near -> long then holds flat', () => {
    const f = { nearYear: 2029, nearPercent: 8, longYear: 2039, longPercent: 4 };
    expect(rateAt(0, 6, f, 2026)).toBe(6);
    expect(rateAt(1.5, 6, f, 2026)).toBeCloseTo(7, 6);
    expect(rateAt(3, 6, f, 2026)).toBeCloseTo(8, 6);
    expect(rateAt(8, 6, f, 2026)).toBeCloseTo(6, 6);
    expect(rateAt(13, 6, f, 2026)).toBeCloseTo(4, 6);
    expect(rateAt(25, 6, f, 2026)).toBe(4);
  });
});

describe('mortgage schedule', () => {
  it('flat 6% for full term repays exactly at term end', () => {
    const r = calculateMortgage(base());
    expect(r.loanAmount).toBe(800_000);
    expect(r.lvrAtStart).toBeCloseTo(0.8, 6);
    expect(r.initialRepayment).toBeCloseTo(4_796.4, 1);
    expect(r.payoffYears).toBeCloseTo(30, 1);
    // total interest for a flat 30y 6% loan: 4796.40 x 360 - 800,000
    expect(r.totalInterest).toBeCloseTo(4_796.4 * 360 - 800_000, -2);
    expect(r.points[r.points.length - 1].balance).toBeLessThan(1);
  });

  it('fortnightly halves the period and pays off in the same term', () => {
    const r = calculateMortgage({ ...base(), frequency: 'fortnightly' });
    expect(r.initialRepayment).toBeCloseTo(amortisedRepayment(800_000, 6, 30 * 26, 26), 1);
    expect(r.payoffYears).toBeCloseTo(30, 1);
  });

  it('extra repayments shorten the loan and save interest', () => {
    const r = calculateMortgage({ ...base(), extraPerPeriod: 1_000 });
    expect(r.payoffYears).toBeLessThan(24);
    expect(r.interestSavedByExtras).toBeGreaterThan(150_000);
    expect(r.yearsSavedByExtras).toBeGreaterThan(6);
  });

  it('rising rate forecast raises later repayments', () => {
    const inputs = {
      ...base(),
      rateForecast: { nearYear: 2029, nearPercent: 8, longYear: 2039, longPercent: 8 },
    };
    const r = calculateMortgage(inputs);
    const early = r.points[0].repayment;
    const later = r.points[5 * 12].repayment;
    expect(later).toBeGreaterThan(early * 1.1);
    expect(r.totalInterest).toBeGreaterThan(calculateMortgage(base()).totalInterest);
  });

  it('fixed 2 years ignores the forecast until the fixed period ends', () => {
    const inputs = {
      ...base(),
      portions: [
        { amount: 800_000, ratePercent: 5.5, option: 'fixed2y' as const, interestOnlyYears: 0 },
        base().portions[1],
      ],
      rateForecast: { nearYear: 2027, nearPercent: 9, longYear: 2039, longPercent: 9 },
    };
    const r = calculateMortgage(inputs);
    // during fixed period the rate stays 5.5
    expect(r.points[12].ratePercent).toBeCloseTo(5.5, 6);
    // after 2 years it follows the forecast (9%)
    expect(r.points[3 * 12].ratePercent).toBeGreaterThan(8.5);
  });

  it('interest-only pays no principal during the IO period', () => {
    const inputs = {
      ...base(),
      portions: [
        { amount: 800_000, ratePercent: 6, option: 'variable' as const, interestOnlyYears: 5 },
        base().portions[1],
      ],
    };
    const r = calculateMortgage(inputs);
    expect(r.points[0].principal).toBeCloseTo(0, 6);
    expect(r.points[0].repayment).toBeCloseTo(4_000, 0); // 800k x 6% / 12
    expect(r.points[4 * 12].balance).toBeCloseTo(800_000, 0);
    // then amortises over the remaining 25 years
    expect(r.points[5 * 12].repayment).toBeCloseTo(amortisedRepayment(800_000, 6, 25 * 12, 12), 0);
    expect(r.payoffYears).toBeCloseTo(30, 1);
  });

  it('split loan sums two independently simulated portions', () => {
    const inputs: MortgageInputs = {
      ...base(),
      split: true,
      portions: [
        { amount: 400_000, ratePercent: 6, option: 'variable', interestOnlyYears: 0 },
        { amount: 400_000, ratePercent: 5.5, option: 'fixed2y', interestOnlyYears: 0 },
      ],
    };
    const r = calculateMortgage(inputs);
    const expected =
      amortisedRepayment(400_000, 6, 360, 12) + amortisedRepayment(400_000, 5.5, 360, 12);
    expect(r.initialRepayment).toBeCloseTo(expected, 1);
    expect(r.loanAmount).toBe(800_000);
  });

  it('property value compounds and equity grows', () => {
    const r = calculateMortgage(base());
    const after10y = r.points[10 * 12 - 1];
    // 1M at 4% for 10 years ~ 1.48M
    expect(after10y.propertyValue).toBeGreaterThan(1_400_000);
    expect(after10y.propertyValue).toBeLessThan(1_560_000);
    expect(after10y.equity).toBeCloseTo(after10y.propertyValue - after10y.balance, 6);
    expect(r.endPropertyValue).toBeGreaterThan(3_000_000);
  });

  it('initial costs are deposit plus fees', () => {
    const r = calculateMortgage({ ...base(), upfrontFees: 42_000 });
    expect(r.initialCosts).toBe(242_000);
  });
});
