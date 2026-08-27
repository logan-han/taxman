import { describe, it, expect } from 'vitest';
import { FY_DATA } from '../data';
import {
  calculateNovatedLease,
  defaultNovated,
  gradeRate,
  impliedAnnualRatePercent,
  luxuryVehicleAdjustmentPerYear,
} from './novatedLease';

const fy27 = FY_DATA['2026-27'];

/**
 * Golden fixture A: Maxxia quote 1429840 (22 Jul 2026), 2026 Volvo EX60 Ultra
 * P6 Electric. All expected values derived in RESEARCH-NOVATED.md section 2.
 * Pinned explicitly so UI defaults can evolve without touching the fixture.
 */
const FIXTURE = {
  vehicleType: 'bev' as const,
  carPrice: 90_417,
  fbtBaseValue: 0,
  amountFinanced: 0,
  financePerFortnight: 883.11,
  runningPerFortnight: 191.7,
  termYears: 5,
  residual: 27_978,
  residualIncludesGst: false,
  startYear: 2026,
  startMonth: 8,
  lvaPassedOn: true,
  salary: 100_000,
  hasStudentLoan: false,
  privateHospitalCover: false,
  carLoanRatePercent: 7.0,
  mortgageRatePercent: 5.9,
};

describe('implied APR solver (fixture A)', () => {
  it('financed at price minus the capped GST credit -> 19.36% nominal', () => {
    const apr = impliedAnnualRatePercent(84_064, 883.11, 130, 27_978);
    expect(apr).not.toBeNull();
    expect(apr!).toBeCloseTo(19.36, 1);
  });

  it('most charitable reading (financed $99,460, residual at the ATO floor) -> 12.79%', () => {
    expect(impliedAnnualRatePercent(99_460, 883.11, 130, 27_978)!).toBeCloseTo(12.79, 1);
  });

  it('returns 0 when total repayments do not exceed the financed amount', () => {
    expect(impliedAnnualRatePercent(100_000, 100, 130, 27_978)).toBe(0);
  });

  it('returns null when nothing anchors a rate', () => {
    expect(impliedAnnualRatePercent(0, 883.11, 130, 27_978)).toBeNull();
    expect(impliedAnnualRatePercent(84_064, 0, 130, 27_978)).toBeNull();
  });

  it('round-trips an honest 7% loan structure', () => {
    // PMT for 84,064 at 7% over 130 fortnights with a 27,978 balloon
    const r = 0.07 / 26;
    const pmt = ((84_064 - 27_978 / Math.pow(1 + r, 130)) * r) / (1 - Math.pow(1 + r, -130));
    expect(impliedAnnualRatePercent(84_064, pmt, 130, 27_978)!).toBeCloseTo(7.0, 2);
  });

  it('grades rates against the market bands', () => {
    expect(gradeRate(6.9)).toBe('competitive');
    expect(gradeRate(9.5)).toBe('typical');
    expect(gradeRate(12)).toBe('typical');
    expect(gradeRate(12.5)).toBe('elevated');
    expect(gradeRate(19.36)).toBe('high');
  });
});

describe('luxury vehicle adjustment (SG Fleet formula)', () => {
  it('fixture A: ~$811/yr on $84,064 financed over 5 years', () => {
    expect(luxuryVehicleAdjustmentPerYear(84_064, 27_978, 69_883, 5)).toBeCloseTo(811, 0);
  });

  it('nil at or below the car limit', () => {
    expect(luxuryVehicleAdjustmentPerYear(69_883, 20_000, 69_883, 5)).toBe(0);
    expect(luxuryVehicleAdjustmentPerYear(40_000, 15_000, 69_883, 5)).toBe(0);
  });

  it('reproduces the published SG Fleet worked example', () => {
    // AF $75,782.32, RV $26,523.81, car limit $68,108 -> $2,137.85 over the term
    const perYear = luxuryVehicleAdjustmentPerYear(75_782.32, 26_523.81, 68_108, 1);
    expect(perYear).toBeCloseTo(2_137.85, 0);
  });
});

describe('calculateNovatedLease (fixture A: exempt EV, $100k salary)', () => {
  const r = calculateNovatedLease(FIXTURE, fy27);

  it('estimates the amount financed as price minus the capped GST credit', () => {
    expect(r.financedIsEstimate).toBe(true);
    expect(r.gstCreditOnCar).toBeCloseTo(6_353, 0);
    expect(r.gstCreditIsCapped).toBe(true);
    expect(r.amountFinanced).toBeCloseTo(84_064, 0);
  });

  it('exposes the implied APR as "high"', () => {
    expect(r.impliedAprPercent!).toBeCloseTo(19.36, 1);
    expect(r.impliedGrade).toBe('high');
  });

  it('lease-to-own total includes GST on the residual', () => {
    expect(r.residualGst).toBeCloseTo(2_797.8, 1);
    expect(r.residualPayout).toBeCloseTo(30_775.8, 1);
    expect(r.leaseToOwnTotal).toBeCloseTo(145_580.1, 0);
    expect(r.interestAndFees).toBeCloseTo(58_718.3, 0);
  });

  it('flags the residual sitting above the ATO 5-year minimum', () => {
    expect(r.minResidualPercent).toBe(0.2813);
    expect(r.minResidualAmount!).toBeCloseTo(23_647, 0);
    expect(FIXTURE.residual).toBeGreaterThan(r.minResidualAmount!);
  });

  it('treats an Aug 2026 commencement as fully exempt under current law', () => {
    expect(r.treatment.kind).toBe('exempt');
    expect(r.phaseRulesAreAnnouncedOnly).toBe(false);
    expect(r.ecmPerYear).toBe(0);
  });

  it('reports RFBA at the type 2 gross-up of the notional 20% value', () => {
    expect(r.notionalTaxableValue).toBeCloseTo(18_083.4, 1);
    expect(r.rfbaPerYear).toBeCloseTo(34_119.75, 0);
  });

  it('passes the LVA through the package', () => {
    expect(r.lvaPerYear).toBeCloseTo(811, 0);
    expect(r.preTaxPerYear).toBeCloseTo(27_945.06 + 811.09, 0);
  });

  it('RFBA drags MLS into tier 1 despite the lower taxable income (no hospital cover)', () => {
    expect(r.baseline.medicareSurcharge).toBe(0);
    expect(r.withLease.mlsTierRate).toBe(0.01);
    expect(r.mlsDeltaPerYear).toBeGreaterThan(1_000);
  });

  it('take-home drop = package deduction minus tax actually saved', () => {
    expect(r.takeHomeDropPerYear).toBeCloseTo(r.preTaxPerYear - r.taxSavedPerYear, 6);
    // sanity: the drop sits between zero and the full package
    expect(r.takeHomeDropPerYear).toBeGreaterThan(0);
    expect(r.takeHomeDropPerYear).toBeLessThan(r.packageCostsPerYear);
  });

  it('adds GST back to running costs for the non-lease scenarios', () => {
    expect(r.retailRunningPerFortnight).toBeCloseTo(191.7 * 1.1, 2);
  });

  it('all four scenarios are present and end owning the car', () => {
    expect(r.scenarios.map((s) => s.key)).toEqual(['novated', 'cash', 'loan', 'redraw']);
    const novated = r.scenarios[0];
    expect(novated.final).toBeCloseTo(r.residualPayout, 2);
    // the loan and redraw scenarios have no balloon
    expect(r.scenarios[2].final).toBe(0);
    expect(r.scenarios[3].final).toBe(0);
  });

  it('redraw beats the car loan whenever the mortgage rate is lower', () => {
    const loan = r.scenarios.find((s) => s.key === 'loan')!;
    const redraw = r.scenarios.find((s) => s.key === 'redraw')!;
    expect(redraw.endOfTermCost).toBeLessThan(loan.endOfTermCost);
  });
});

describe('scenario verdicts respond to circumstances', () => {
  it('a HELP debt erodes the lease advantage (RFBA exceeds the deduction)', () => {
    const without = calculateNovatedLease(FIXTURE, fy27);
    const withHelp = calculateNovatedLease({ ...FIXTURE, hasStudentLoan: true }, fy27);
    expect(withHelp.stslDeltaPerYear).toBeGreaterThan(700);
    expect(withHelp.leaseVsBest).toBeGreaterThan(without.leaseVsBest);
  });

  it('an ICE car on the same numbers loses the exemption and costs far more', () => {
    const ice = calculateNovatedLease({ ...FIXTURE, vehicleType: 'ice' }, fy27);
    expect(ice.treatment.kind).toBe('taxable');
    expect(ice.ecmPerYear).toBeCloseTo(0.2 * FIXTURE.carPrice, 0);
    expect(ice.rfbaPerYear).toBe(0);
    expect(ice.ecmGstPerYear).toBeCloseTo((0.2 * FIXTURE.carPrice) / 11, 0);
    const evResult = calculateNovatedLease(FIXTURE, fy27);
    expect(ice.novated.endOfTermCost).toBeGreaterThan(evResult.novated.endOfTermCost);
  });

  it('the same lease commencing April 2027 (over $75k) drops to the 25% discount', () => {
    const late = calculateNovatedLease({ ...FIXTURE, startYear: 2027, startMonth: 4 }, fy27);
    expect(late.treatment.kind).toBe('discounted');
    expect(late.phaseRulesAreAnnouncedOnly).toBe(true);
    expect(late.ecmPerYear).toBeCloseTo(0.15 * FIXTURE.carPrice, 0);
    expect(late.rfbaPerYear).toBe(0);
  });

  it('a $75k BEV commencing April 2027 keeps the full exemption', () => {
    const cheap = calculateNovatedLease(
      { ...FIXTURE, carPrice: 75_000, startYear: 2027, startMonth: 4 },
      fy27,
    );
    expect(cheap.treatment.kind).toBe('exempt');
    expect(cheap.phaseRulesAreAnnouncedOnly).toBe(true);
  });

  it('disclosing a larger financed amount lowers the implied APR', () => {
    const disclosed = calculateNovatedLease({ ...FIXTURE, amountFinanced: 99_460 }, fy27);
    expect(disclosed.financedIsEstimate).toBe(false);
    expect(disclosed.impliedAprPercent!).toBeCloseTo(12.79, 1);
    expect(disclosed.impliedGrade).toBe('elevated');
  });

  it('a GST-inclusive residual is normalised before the payout is computed', () => {
    const incl = calculateNovatedLease(
      { ...FIXTURE, residual: 30_775.8, residualIncludesGst: true },
      fy27,
    );
    expect(incl.residualExGst).toBeCloseTo(27_978, 0);
    expect(incl.residualPayout).toBeCloseTo(30_775.8, 0);
  });
});

/**
 * Golden fixture B: Flare Cars quote 247963 (22 Jul 2026), indicative EV,
 * exempt treatment. Unlike fixture A this provider disclosed the financed
 * amount, the FBT base value, the ITC and the residual GST split, so it
 * cross-validates the model against a provider's own arithmetic.
 */
describe('golden fixture B: Flare Cars quote (exempt EV, disclosed financed amount)', () => {
  const flare = {
    vehicleType: 'bev' as const,
    carPrice: 90_843.2, // "total on-road price"
    fbtBaseValue: 85_600, // disclosed: drive-away less government on-roads
    amountFinanced: 84_490.2, // disclosed as "vehicle cost"
    financePerFortnight: 697.21,
    runningPerFortnight: 183.16, // $880.37 total budget less finance, incl $11.54 management fee
    termYears: 5,
    residual: 26_143.8,
    residualIncludesGst: true, // Flare prints the residual inc GST
    startYear: 2026,
    startMonth: 8,
    lvaPassedOn: false, // no luxury adjustment line in Flare's itemised budget
    salary: 180_000, // as on the quote
    hasStudentLoan: false,
    privateHospitalCover: true, // isolates Flare's tax maths (their quote ignores MLS)
    carLoanRatePercent: 7,
    mortgageRatePercent: 5.9,
  };
  const r = calculateNovatedLease(flare, fy27);

  it('honours the disclosed financed amount and solves a 10.50% implied rate', () => {
    expect(r.financedIsEstimate).toBe(false);
    expect(r.impliedAprPercent!).toBeCloseTo(10.5, 1);
    expect(r.impliedGrade).toBe('typical');
  });

  it('our financed-amount estimate reproduces the disclosed figure from the price', () => {
    const est = calculateNovatedLease({ ...flare, amountFinanced: 0 }, fy27);
    expect(est.amountFinanced).toBeCloseTo(84_490.2, 1);
  });

  it('normalises the GST-inclusive residual to the quote’s own split, at the ATO floor', () => {
    expect(r.residualExGst).toBeCloseTo(23_767.09, 1);
    expect(r.residualGst).toBeCloseTo(2_376.71, 1);
    expect(r.residualExGst / r.amountFinanced).toBeCloseTo(0.2813, 4);
  });

  it('uses the disclosed FBT base value for RFBA, not the drive-away price', () => {
    expect(r.rfbaPerYear).toBeCloseTo(0.2 * 85_600 * 1.8868, 0); // $32,302, not $34,281
  });

  it('reproduces the quote’s net take-home impact within a dollar a fortnight', () => {
    // Flare prints $536.37; the engine solves $537.03 (their PAYG rounding)
    expect(Math.abs(r.takeHomeDropPerYear / 26 - 536.37)).toBeLessThan(1);
  });
});

describe('UI defaults', () => {
  it('shows a $75k EV (the announced phase-2 cap) at a typical big-provider 12%', () => {
    const d = defaultNovated(new Date(2026, 7, 10));
    expect(d.carPrice).toBe(75_000);
    expect(d.vehicleType).toBe('bev');
    const r = calculateNovatedLease(d, fy27);
    // exempt on either side of the April 2027 boundary (at the $75k cap)
    expect(r.treatment.kind).toBe('exempt');
    // financed under the car limit, so no luxury adjustment complicates the demo
    expect(r.amountFinanced).toBeCloseTo(68_647, 0);
    expect(r.lvaPerYear).toBe(0);
    expect(r.impliedAprPercent!).toBeCloseTo(12.0, 2);
    expect(r.impliedGrade).toBe('typical');
    // residual defaults to the ATO 5-year minimum
    expect(d.residual / r.amountFinanced).toBeCloseTo(0.2813, 3);
  });

  it('every alternative carries its difference vs the lease', () => {
    const r = calculateNovatedLease(defaultNovated(new Date(2026, 7, 10)), fy27);
    expect(r.novated.vsLease).toBe(0);
    for (const s of r.scenarios.slice(1)) {
      expect(s.vsLease).toBeCloseTo(s.endOfTermCost - r.novated.endOfTermCost, 6);
    }
  });
});
