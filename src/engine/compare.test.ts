import { describe, it, expect } from 'vitest';
import { FY_DATA } from '../data';
import {
  AU_STATES,
  DEFAULT_COMPARE,
  STATE_PUBLIC_HOLIDAYS,
  compareContractPermanent,
} from './compare';

const fy27 = FY_DATA['2026-27'];
const fy26 = FY_DATA['2025-26'];

describe('contractor vs permanent', () => {
  it('reference scenario: $700/day vs $130k, FY2025-26', () => {
    // 260 - 12 - 20 - 5 = 223 paid days; 223 x 700 = 156,100 ex super
    const r = compareContractPermanent(DEFAULT_COMPARE, fy26);
    expect(r.contractPaidDays).toBe(223);
    expect(r.contractRatePerDay).toBe(700);
    expect(r.contract.taxableIncome).toBeCloseTo(156_100, 2);
    // contract tax FY2025-26: 31,288 + 37% x 21,100 = 39,095; medicare 3,122
    // MLS tier 1 (156,100 > 158,000? no, tier 2 from 118k: 1.25%) = 1,951.25
    expect(r.contract.result.netIncomeTax).toBeCloseTo(39_095, 2);
    expect(r.contract.result.medicareLevy).toBeCloseTo(3_122, 2);
    expect(r.contract.result.mlsTierRate).toBe(0.0125);
    // permanent: 130,000 -> tax 4,288 + 30% x 85,000 = 29,788; medicare 2,600;
    // MLS tier 2 threshold 118k < 130k < 158k -> 1.25% = 1,625
    expect(r.permanent.result.netIncomeTax).toBeCloseTo(29_788, 2);
    expect(r.permanent.result.medicareLevy).toBeCloseTo(2_600, 2);
    expect(r.permanent.result.medicareSurcharge).toBeCloseTo(1_625, 2);
    // super on top at 12%
    expect(r.contract.superAmount).toBeCloseTo(156_100 * 0.12, 2);
    expect(r.permanent.superAmount).toBeCloseTo(15_600, 2);
    expect(r.deltaTakeHome).toBeGreaterThan(0);
  });

  it('private hospital cover removes MLS from both sides', () => {
    const r = compareContractPermanent(
      { ...DEFAULT_COMPARE, privateHospitalCover: true },
      fy26,
    );
    expect(r.contract.result.medicareSurcharge).toBe(0);
    expect(r.permanent.result.medicareSurcharge).toBe(0);
  });

  it('hourly rates convert via hours per day', () => {
    const r = compareContractPermanent(
      { ...DEFAULT_COMPARE, contractTimeUnit: 'hourly', contractRate: 100, hoursPerDay: 7.5 },
      fy27,
    );
    expect(r.contractRatePerDay).toBe(750);
    expect(r.contract.packageTotal).toBeCloseTo(750 * 223 * 1.12, 2);
  });

  it('includes-super carves super out instead of adding it on top', () => {
    const inc = compareContractPermanent(
      { ...DEFAULT_COMPARE, contractIncludesSuper: true },
      fy27,
    );
    const excl = compareContractPermanent(DEFAULT_COMPARE, fy27);
    expect(inc.contract.packageTotal).toBeCloseTo(700 * 223, 2);
    expect(inc.contract.taxableIncome).toBeCloseTo((700 * 223) / 1.12, 2);
    expect(excl.contract.packageTotal).toBeCloseTo(700 * 223 * 1.12, 2);
  });

  it('study loan applies to both sides', () => {
    const r = compareContractPermanent({ ...DEFAULT_COMPARE, hasStudentLoan: true }, fy27);
    expect(r.contract.result.studentLoanRepayment).toBeGreaterThan(0);
    expect(r.permanent.result.studentLoanRepayment).toBeGreaterThan(0);
  });

  it('paid days never go negative', () => {
    const r = compareContractPermanent(
      { ...DEFAULT_COMPARE, publicHolidayDays: 300 },
      fy27,
    );
    expect(r.contractPaidDays).toBe(0);
    expect(r.contract.takeHome).toBe(0);
  });

  it('zero permanent take-home yields zero percent, not NaN', () => {
    const r = compareContractPermanent({ ...DEFAULT_COMPARE, permSalary: 0 }, fy27);
    expect(r.deltaPercent).toBe(0);
  });

  it('covers all eight states with plausible holiday defaults', () => {
    expect(AU_STATES).toHaveLength(8);
    for (const s of AU_STATES) {
      expect(STATE_PUBLIC_HOLIDAYS[s]).toBeGreaterThanOrEqual(10);
      expect(STATE_PUBLIC_HOLIDAYS[s]).toBeLessThanOrEqual(15);
    }
    expect(STATE_PUBLIC_HOLIDAYS[DEFAULT_COMPARE.state]).toBe(
      DEFAULT_COMPARE.publicHolidayDays,
    );
  });
});
