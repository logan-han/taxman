import { describe, it, expect } from 'vitest';
import { CAR_THRESHOLDS, MIN_RESIDUAL_PERCENT, evFbtTreatment, monthKey } from './fbt';

describe('car thresholds', () => {
  it('GST credit cap is 1/11 of the car limit (rounded down to the dollar)', () => {
    for (const t of Object.values(CAR_THRESHOLDS)) {
      expect(t.maxGstCredit).toBe(Math.floor(t.carLimit / 11));
    }
  });

  it('FY2026-27 matches the ATO published figures', () => {
    const t = CAR_THRESHOLDS['2026-27'];
    expect(t.carLimit).toBe(69_883);
    expect(t.maxGstCredit).toBe(6_353); // the exact "GST savings" on the Maxxia fixture quote
    expect(t.lctFuelEfficient).toBe(91_661);
  });
});

describe('minimum residuals', () => {
  it('follows 75% of straight-line WDV over an 8-year life', () => {
    for (const term of [1, 2, 3, 4, 5]) {
      const formula = 0.75 - (0.75 / 8) * term;
      expect(MIN_RESIDUAL_PERCENT[term]).toBeCloseTo(formula, 3);
    }
  });
});

describe('evFbtTreatment phase rules', () => {
  const LCT_FE = 91_661;

  it('ICE cars are always taxable at 20%', () => {
    expect(evFbtTreatment('ice', 40_000, 2026, 8, LCT_FE)).toEqual({
      kind: 'taxable',
      statutoryFraction: 0.2,
    });
  });

  it('BEV over the fuel-efficient LCT threshold is never exempt', () => {
    expect(evFbtTreatment('bev', 95_000, 2026, 8, LCT_FE).kind).toBe('taxable');
  });

  it('BEV under the threshold: fully exempt for commencements to March 2027', () => {
    // the Maxxia fixture: $90,417 EX60, over $75k but under the LCT gate
    expect(evFbtTreatment('bev', 90_417, 2027, 3, LCT_FE).kind).toBe('exempt');
  });

  it('phase 2 (Apr 2027 - Mar 2029): $75k cap splits exempt from discounted', () => {
    expect(evFbtTreatment('bev', 75_000, 2027, 4, LCT_FE).kind).toBe('exempt');
    const over = evFbtTreatment('bev', 90_417, 2027, 4, LCT_FE);
    expect(over.kind).toBe('discounted');
    expect(over.statutoryFraction).toBe(0.15); // 20% x (1 - 25% discount)
  });

  it('phase 3 (from Apr 2029): discount only, even at $75k or less', () => {
    expect(evFbtTreatment('bev', 50_000, 2029, 4, LCT_FE).kind).toBe('discounted');
  });

  it('monthKey compares lexicographically across month boundaries', () => {
    expect(monthKey(2027, 3) < monthKey(2027, 4)).toBe(true);
    expect(monthKey(2026, 12) < monthKey(2027, 1)).toBe(true);
  });
});
