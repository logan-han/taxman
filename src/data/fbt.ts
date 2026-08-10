import type { FinancialYear } from './types';

/**
 * FBT and car-threshold facts for novated lease modelling.
 *
 * Kept out of FYData because the FBT year runs 1 April - 31 March (misaligned
 * with the financial year) and the EV exemption phase rules turn on the lease
 * commencement date, not the FY. Car thresholds are indexed per FY, so they
 * key off FinancialYear like everything else.
 *
 * See RESEARCH-NOVATED.md for the full evidence trail.
 */

export const FBT_RATES = {
  /** FBT rate, unchanged through the FBT year ending 31 March 2027 */
  rate: 0.47,
  /** statutory formula method: flat fraction of base value since 1 April 2014 */
  statutoryFraction: 0.2,
  /** gross-up where the employer claims GST credits (employer liability only) */
  grossUpType1: 2.0802,
  /** lower gross-up; ALWAYS the rate used for RFBA regardless of GST status */
  grossUpType2: 1.8868,
  source: {
    url: 'https://www.ato.gov.au/tax-rates-and-codes/fringe-benefits-tax-rates-and-thresholds',
    checked: '2026-08-10',
  },
} as const;

export interface CarThresholds {
  /** car cost (depreciation) limit; Div 242 luxury lease rules apply above it */
  carLimit: number;
  /** maximum GST input tax credit on a car purchase: 1/11 of the car limit */
  maxGstCredit: number;
  /** LCT threshold for fuel-efficient vehicles: the EV exemption price gate */
  lctFuelEfficient: number;
  /** LCT threshold for other vehicles */
  lctOther: number;
}

export const CAR_THRESHOLDS: Record<FinancialYear, CarThresholds> = {
  '2024-25': { carLimit: 69_674, maxGstCredit: 6_334, lctFuelEfficient: 91_387, lctOther: 80_567 },
  '2025-26': { carLimit: 69_674, maxGstCredit: 6_334, lctFuelEfficient: 91_387, lctOther: 80_567 },
  '2026-27': { carLimit: 69_883, maxGstCredit: 6_353, lctFuelEfficient: 91_661, lctOther: 80_809 },
};

export const CAR_THRESHOLDS_SOURCES = {
  carLimit: {
    url: 'https://www.ato.gov.au/businesses-and-organisations/small-business-newsroom/car-thresholds-from-1-july',
    checked: '2026-08-10',
    note: 'Car limit $69,883 and max GST credit $6,353 from 1 July 2026.',
  },
  lct: {
    url: 'https://www.ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds',
    checked: '2026-08-10',
    note: 'Fuel-efficient $91,661 / other $80,809 for 2026-27 (indexation factor 1.003).',
  },
} as const;

/**
 * ATO minimum residual values for car leases, as a fraction of the amount
 * financed (ex GST): 75% of straight-line written-down value over an 8-year
 * effective life (IT 28 lineage, TD 93/142 formula, ATO ID 2002/1004).
 * Providers may set higher residuals; lower risks the lease not being bona fide.
 */
export const MIN_RESIDUAL_PERCENT: Record<number, number> = {
  1: 0.6563,
  2: 0.5625,
  3: 0.4688,
  4: 0.375,
  5: 0.2813,
};

export const MIN_RESIDUAL_SOURCE = {
  url: 'https://www.ato.gov.au/law/view/document?docid=aid/aid20021004/00001',
  checked: '2026-08-10',
} as const;

/**
 * The Electric Car Discount and its announced wind-back.
 *
 * Announced 5 May 2026 alongside the Treasury review's final report and booked
 * in Budget 2026-27; NOT yet legislated as at the checked date. Existing leases
 * keep the treatment that applied at commencement, for their term.
 */
export const EV_PHASE_OUT = {
  legislated: false,
  announced: '2026-05-05',
  /** PHEVs ceased to be eligible for arrangements from 1 April 2025 */
  phevEndsFrom: '2025-04',
  /** from 1 April 2027: full exemption only at or below the value cap */
  phase2From: '2027-04',
  phase2FullExemptionCap: 75_000,
  /** from 1 April 2029: no full exemption for any new lease */
  phase3From: '2029-04',
  /** 25% discount on FBT otherwise payable = effective statutory fraction */
  discountedStatutoryFraction: 0.15,
  source: {
    url: 'https://ministers.treasury.gov.au/ministers/jim-chalmers-2022/media-releases/fairer-tax-treatment-encourage-affordable-evs',
    checked: '2026-08-10',
    note: 'Announcement stage; the $75,000 valuation basis is not yet defined in law.',
  },
} as const;

/**
 * PHEVs are deliberately folded into 'ice': they lost the exemption for new
 * arrangements from 1 April 2025, so a new PHEV lease is taxed exactly like
 * petrol. A pre-April-2025 grandfathered PHEV arrangement can be modelled by
 * selecting the EV option.
 */
export type VehicleType = 'bev' | 'ice';

export interface FbtTreatment {
  /**
   * exempt: no FBT, 100% pre-tax, but RFBA still reportable.
   * discounted: FBT at the 25%-discounted rate; ECM can zero it (no RFBA then).
   * taxable: normal statutory formula; ECM can zero it (no RFBA then).
   */
  kind: 'exempt' | 'discounted' | 'taxable';
  /** statutory fraction after any discount (ECM post-tax share of base value) */
  statutoryFraction: number;
}

/** 'yyyy-mm' key so commencement months compare lexicographically */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * FBT treatment for a lease commencing in the given month, under the announced
 * phase rules. Grandfathering means the treatment at commencement holds for the
 * lease term. carPrice stands in for both the LCT eligibility test and the
 * announced $75k cap (valuation bases pending legislation).
 */
export function evFbtTreatment(
  vehicle: VehicleType,
  carPrice: number,
  startYear: number,
  startMonth: number,
  lctFuelEfficient: number,
): FbtTreatment {
  const full = { kind: 'taxable' as const, statutoryFraction: FBT_RATES.statutoryFraction };
  const start = monthKey(startYear, startMonth);

  if (vehicle === 'ice') return full;
  // BEV: never eligible if LCT was payable at first retail sale
  if (carPrice > lctFuelEfficient) return full;
  if (start < EV_PHASE_OUT.phase2From) {
    return { kind: 'exempt', statutoryFraction: FBT_RATES.statutoryFraction };
  }
  if (start < EV_PHASE_OUT.phase3From && carPrice <= EV_PHASE_OUT.phase2FullExemptionCap) {
    return { kind: 'exempt', statutoryFraction: FBT_RATES.statutoryFraction };
  }
  return { kind: 'discounted', statutoryFraction: EV_PHASE_OUT.discountedStatutoryFraction };
}
