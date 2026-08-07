import { describe, it, expect } from 'vitest';
import { FY_DATA } from '../data';
import {
  DEFAULT_INPUTS,
  calculate,
  litoAmount,
  medicareLevyAmount,
  studentLoanRepayment,
  superGuaranteeAmount,
  taxFromBrackets,
} from './calculate';

const fy27 = FY_DATA['2026-27'];
const fy26 = FY_DATA['2025-26'];
const fy25 = FY_DATA['2024-25'];

describe('income tax brackets', () => {
  it('FY2026-27 resident: $100,000 -> $20,520 (golden fixture)', () => {
    expect(taxFromBrackets(100_000, fy27.residentBrackets)).toBeCloseTo(20_520, 2);
  });

  it('FY2025-26 resident: $100,000 -> $20,788', () => {
    // $4,288 + 30% x $55,000
    expect(taxFromBrackets(100_000, fy26.residentBrackets)).toBeCloseTo(20_788, 2);
  });

  it('FY2024-25 equals FY2025-26 at several points', () => {
    for (const ti of [18_200, 18_201, 45_000, 100_000, 135_000, 190_000, 250_000]) {
      expect(taxFromBrackets(ti, fy25.residentBrackets)).toBeCloseTo(
        taxFromBrackets(ti, fy26.residentBrackets),
        6,
      );
    }
  });

  it('bracket boundaries are continuous (FY2026-27)', () => {
    for (const b of fy27.residentBrackets.slice(1)) {
      const below = taxFromBrackets(b.min, fy27.residentBrackets);
      const above = taxFromBrackets(b.min + 0.01, fy27.residentBrackets);
      expect(above - below).toBeLessThan(0.011);
    }
  });

  it('tax-free threshold: nil at $18,200', () => {
    expect(taxFromBrackets(18_200, fy27.residentBrackets)).toBe(0);
  });

  it('foreign resident: 30c from the first dollar, $40,500 base at $135,001', () => {
    expect(taxFromBrackets(10_000, fy27.foreignBrackets)).toBeCloseTo(3_000, 2);
    expect(taxFromBrackets(135_000, fy27.foreignBrackets)).toBeCloseTo(40_500, 2);
  });

  it('WHM: 15c to $45,000 then $6,750 base', () => {
    expect(taxFromBrackets(45_000, fy27.whmBrackets)).toBeCloseTo(6_750, 2);
    expect(taxFromBrackets(100_000, fy27.whmBrackets)).toBeCloseTo(6_750 + 0.3 * 55_000, 2);
  });
});

describe('LITO', () => {
  it('maximum $700 at or below $37,500', () => {
    expect(litoAmount(37_500, fy27, 'resident')).toBe(700);
    expect(litoAmount(20_000, fy27, 'resident')).toBe(700);
  });

  it('first taper: $325 remains at $45,000', () => {
    expect(litoAmount(45_000, fy27, 'resident')).toBeCloseTo(325, 2);
  });

  it('second taper reaches ~0 at $66,667', () => {
    expect(litoAmount(66_667, fy27, 'resident')).toBeLessThan(1);
    expect(litoAmount(66_668, fy27, 'resident')).toBe(0);
  });

  it('not applied to foreign residents or WHMs', () => {
    expect(litoAmount(30_000, fy27, 'foreign')).toBe(0);
    expect(litoAmount(30_000, fy27, 'whm')).toBe(0);
  });
});

describe('Medicare levy', () => {
  it('$100,000 FY2026-27 -> $2,000 (golden fixture)', () => {
    expect(medicareLevyAmount(100_000, fy27, 'resident', 'none')).toBeCloseTo(2_000, 2);
  });

  it('nil at or below the lower threshold', () => {
    expect(medicareLevyAmount(28_011, fy26, 'resident', 'none')).toBe(0);
  });

  it('shade-in is continuous at the upper threshold (FY2025-26)', () => {
    const atUpper = medicareLevyAmount(35_013, fy26, 'resident', 'none');
    // 10% x (35,013 - 28,011) = 700.20 vs 2% x 35,013 = 700.26
    expect(atUpper).toBeCloseTo(700.2, 2);
    expect(medicareLevyAmount(35_014, fy26, 'resident', 'none')).toBeCloseTo(700.28, 2);
  });

  it('FY2024-25 uses $27,222 / $34,027', () => {
    expect(medicareLevyAmount(27_222, fy25, 'resident', 'none')).toBe(0);
    expect(medicareLevyAmount(30_000, fy25, 'resident', 'none')).toBeCloseTo(277.8, 2);
  });

  it('half exemption halves the levy; full removes it', () => {
    expect(medicareLevyAmount(100_000, fy27, 'resident', 'half')).toBeCloseTo(1_000, 2);
    expect(medicareLevyAmount(100_000, fy27, 'resident', 'full')).toBe(0);
  });

  it('not levied on foreign residents or WHMs', () => {
    expect(medicareLevyAmount(100_000, fy27, 'foreign', 'none')).toBe(0);
    expect(medicareLevyAmount(100_000, fy27, 'whm', 'none')).toBe(0);
  });
});

describe('Medicare levy surcharge', () => {
  it('no surcharge with private hospital cover', () => {
    const r = calculate(
      { ...DEFAULT_INPUTS, salary: 150_000, privateHospitalCover: true },
      fy27,
    );
    expect(r.medicareSurcharge).toBe(0);
  });

  it('FY2026-27 single: $104,999 base tier, $105,001 tier 1 (1%)', () => {
    const base = calculate({ ...DEFAULT_INPUTS, salary: 104_999 }, fy27);
    expect(base.medicareSurcharge).toBe(0);
    const t1 = calculate({ ...DEFAULT_INPUTS, salary: 105_001 }, fy27);
    expect(t1.mlsTierRate).toBe(0.01);
    expect(t1.medicareSurcharge).toBeCloseTo(1_050.01, 2);
  });

  it('tier selection includes reportable super; levy base does not', () => {
    // $107k salary with $5k sacrifice: taxable $102k (below the $105k tier 1
    // threshold) but MLS income $107k -> tier 1. Surcharge levied on taxable.
    const r = calculate({ ...DEFAULT_INPUTS, salary: 107_000, salarySacrificeSuper: 5_000 }, fy27);
    expect(r.mlsTierRate).toBe(0.01);
    expect(r.medicareSurcharge).toBeCloseTo(0.01 * 102_000, 2);
  });

  it('family threshold: spouse doubles it; +$1,500 per child after the first', () => {
    const single = calculate({ ...DEFAULT_INPUTS, salary: 150_000 }, fy27);
    expect(single.mlsTierRate).toBeGreaterThan(0);
    const family = calculate(
      { ...DEFAULT_INPUTS, salary: 150_000, hasSpouse: true, spouseIncome: 0 },
      fy27,
    );
    expect(family.mlsTierRate).toBe(0);
    // 3 kids: tier1 family threshold 210,000 + 2x1,500 = 213,000
    const kids = calculate(
      { ...DEFAULT_INPUTS, salary: 212_000, hasSpouse: true, spouseIncome: 0, dependants: 3 },
      fy27,
    );
    expect(kids.mlsTierRate).toBe(0);
  });
});

describe('student loans (STSL)', () => {
  it('FY2026-27 $100,000: $4,571 (golden fixture)', () => {
    const { amount } = studentLoanRepayment(100_000, fy27);
    expect(Math.round(amount)).toBe(4_571);
  });

  it('salary sacrifice does not reduce the repayment (golden trap)', () => {
    const plain = calculate({ ...DEFAULT_INPUTS, hasStudentLoan: true }, fy27);
    const sac = calculate(
      { ...DEFAULT_INPUTS, hasStudentLoan: true, salarySacrificeSuper: 10_000 },
      fy27,
    );
    expect(Math.round(plain.studentLoanRepayment)).toBe(4_571);
    expect(Math.round(sac.studentLoanRepayment)).toBe(4_571);
    expect(sac.repaymentIncome).toBe(plain.repaymentIncome);
  });

  it('FY2024-25 flat: $99,736 repayment income -> 5.5% = $5,485.48 (ATO example)', () => {
    // ATO example: taxable 89,450 + reportable super 10,286 = 99,736 -> 5.5%
    const { amount } = studentLoanRepayment(99_736, fy25);
    expect(amount).toBeCloseTo(0.055 * 99_736, 2);
  });

  it('FY2025-26 marginal: nil at $67,000; 15c over threshold', () => {
    expect(studentLoanRepayment(67_000, fy26).amount).toBe(0);
    expect(studentLoanRepayment(80_000, fy26).amount).toBeCloseTo(0.15 * 13_000, 2);
  });

  it('top band (10% of total) is continuous with the marginal formula', () => {
    // FY2025-26 boundary: marginal at 179,285 vs 10% of total at 179,286
    const below = studentLoanRepayment(179_285, fy26).amount;
    const above = studentLoanRepayment(179_286, fy26).amount;
    expect(Math.abs(above - below)).toBeLessThan(1);
    // FY2026-27 boundary
    const b27 = studentLoanRepayment(186_050, fy27).amount;
    const a27 = studentLoanRepayment(186_051, fy27).amount;
    expect(Math.abs(a27 - b27)).toBeLessThan(1);
  });

  it('FY2024-25 nil below $54,435', () => {
    expect(studentLoanRepayment(54_434, fy25).amount).toBe(0);
  });
});

describe('superannuation', () => {
  it('SG 12% for FY2026-27: $100k -> $12,000 (golden fixture)', () => {
    const r = superGuaranteeAmount(100_000, fy27, false);
    expect(r.superGuarantee).toBeCloseTo(12_000, 2);
  });

  it('SG 11.5% for FY2024-25', () => {
    const r = superGuaranteeAmount(100_000, fy25, false);
    expect(r.superGuarantee).toBeCloseTo(11_500, 2);
  });

  it('salary includes super: $112,000 package -> $100,000 cash + $12,000 SG', () => {
    const r = superGuaranteeAmount(112_000, fy27, true);
    expect(r.cashSalary).toBeCloseTo(100_000, 2);
    expect(r.superGuarantee).toBeCloseTo(12_000, 2);
  });

  it('FY2026-27 annual max contribution base caps SG at $270,830 x 12%', () => {
    const r = superGuaranteeAmount(400_000, fy27, false);
    expect(r.capped).toBe(true);
    expect(r.superGuarantee).toBeCloseTo(270_830 * 0.12, 2);
  });

  it('FY2025-26 quarterly max base caps SG at $62,500 x 4 x 12%', () => {
    const r = superGuaranteeAmount(400_000, fy26, false);
    expect(r.capped).toBe(true);
    expect(r.superGuarantee).toBeCloseTo(62_500 * 4 * 0.12, 2);
  });

  it('flags concessional cap breaches (FY2026-27 cap $32,500)', () => {
    const under = calculate({ ...DEFAULT_INPUTS, salarySacrificeSuper: 20_000 }, fy27);
    expect(under.overConcessionalCap).toBe(false);
    const over = calculate({ ...DEFAULT_INPUTS, salarySacrificeSuper: 21_000 }, fy27);
    expect(over.concessionalTotal).toBeCloseTo(33_000, 2);
    expect(over.overConcessionalCap).toBe(true);
  });
});

describe('Division 293', () => {
  it('golden fixture: $100k income + $12k SG -> Div 293 income $112,000, nil payable', () => {
    const r = calculate(DEFAULT_INPUTS, fy27);
    expect(r.div293Income).toBeCloseTo(112_000, 2);
    expect(r.div293Payable).toBe(0);
  });

  it('payable on lesser of excess and contributions above $250,000', () => {
    const r = calculate({ ...DEFAULT_INPUTS, salary: 260_000 }, fy27);
    // taxable 260,000; SG capped at 32,499.60 (270,830 x 12%); div293 income 292,499.60
    const excess = r.div293Income - 250_000;
    expect(r.div293Payable).toBeCloseTo(0.15 * Math.min(excess, r.concessionalTotal), 2);
  });
});

describe('end-to-end (golden fixture: $100k, FY2026-27)', () => {
  it('reproduces the verified figures', () => {
    const r = calculate({ ...DEFAULT_INPUTS, hasStudentLoan: true }, fy27);
    expect(r.taxableIncome).toBe(100_000);
    expect(Math.round(r.netIncomeTax)).toBe(20_520);
    expect(Math.round(r.medicareLevy)).toBe(2_000);
    expect(Math.round(r.studentLoanRepayment)).toBe(4_571);
    expect(Math.round(r.superGuarantee)).toBe(12_000);
    expect(Math.round(r.totalTax)).toBe(20_520 + 2_000 + 4_571);
    expect(Math.round(r.takeHome)).toBe(100_000 - 27_091);
  });

  it('pay cycle conversion annualises correctly', () => {
    const weekly = calculate({ ...DEFAULT_INPUTS, salary: 2_000, payCycle: 'weekly' }, fy27);
    expect(weekly.grossSalary).toBeCloseTo(104_000, 2);
    const hourly = calculate(
      { ...DEFAULT_INPUTS, salary: 50, payCycle: 'hourly', hoursPerWeek: 38 },
      fy27,
    );
    expect(hourly.grossSalary).toBeCloseTo(50 * 38 * 52, 2);
  });
});
