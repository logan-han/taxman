import type { FYData } from './types';

/**
 * FY 2025-26 (1 July 2025 - 30 June 2026).
 * First year of marginal STSL repayments and the 12% super guarantee.
 * Resident brackets identical to 2024-25 (coincidence, not shared structure).
 */
export const fy2025_26: FYData = {
  fy: '2025-26',
  startYear: 2025,

  residentBrackets: [
    { min: 0, rate: 0, base: 0 },
    { min: 18_200, rate: 0.16, base: 0 },
    { min: 45_000, rate: 0.3, base: 4_288 },
    { min: 135_000, rate: 0.37, base: 31_288 },
    { min: 190_000, rate: 0.45, base: 51_638 },
  ],
  foreignBrackets: [
    { min: 0, rate: 0.3, base: 0 },
    { min: 135_000, rate: 0.37, base: 40_500 },
    { min: 190_000, rate: 0.45, base: 60_850 },
  ],
  whmBrackets: [
    { min: 0, rate: 0.15, base: 0 },
    { min: 45_000, rate: 0.3, base: 6_750 },
    { min: 135_000, rate: 0.37, base: 33_750 },
    { min: 190_000, rate: 0.45, base: 54_100 },
  ],

  lito: {
    max: 700,
    firstTaperFrom: 37_500,
    firstTaperRate: 0.05,
    secondTaperFrom: 45_000,
    secondTaperBase: 325,
    secondTaperRate: 0.015,
    cutOut: 66_667,
  },

  medicare: {
    rate: 0.02,
    lowerSingle: 28_011,
    upperSingle: 35_013,
    shadeInRate: 0.1,
  },

  mls: {
    tiers: [
      { singleFrom: 0, familyFrom: 0, rate: 0 },
      { singleFrom: 101_000, familyFrom: 202_000, rate: 0.01 },
      { singleFrom: 118_000, familyFrom: 236_000, rate: 0.0125 },
      { singleFrom: 158_000, familyFrom: 316_000, rate: 0.015 },
    ],
    perChildAfterFirst: 1_500,
  },

  stsl: {
    kind: 'marginal',
    threshold: 67_000,
    bands: [
      { over: 67_000, rate: 0.15, base: 0 },
      { over: 125_000, rate: 0.17, base: 8_700 },
    ],
    topFrom: 179_286,
    topRate: 0.1,
  },

  superRules: {
    guaranteeRate: 0.12,
    maxContributionBaseQuarterly: 62_500,
    concessionalCap: 30_000,
  },

  div293: { threshold: 250_000, rate: 0.15 },

  hasDerivedFigures: false,

  sources: {
    brackets: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents',
      checked: '2026-08-06',
    },
    foreign: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-foreign-residents',
      checked: '2026-08-06',
    },
    whm: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-working-holiday-makers',
      checked: '2026-08-06',
    },
    lito: {
      url: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset',
      checked: '2026-08-06',
    },
    medicare: {
      url: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners',
      checked: '2026-08-06',
      note: 'single lower $28,011, upper $35,013',
    },
    mls: {
      url: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates',
      checked: '2026-08-06',
    },
    stsl: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds',
      checked: '2026-08-06',
      note: 'Table 2: marginal system; $179,286+ pays 10% of total repayment income',
    },
    super: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee',
      checked: '2026-08-06',
    },
    concessionalCap: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps',
      checked: '2026-08-06',
    },
    div293: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax',
      checked: '2026-08-06',
    },
  },
};
