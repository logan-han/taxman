import type { FYData } from './types';

/**
 * FY 2026-27 (1 July 2026 - 30 June 2027). The current financial year.
 *
 * Resident brackets are DERIVED: the 16% -> 15% cut is law (Treasury Laws
 * Amendment measure confirmed on the ATO new-legislation page) but the ATO
 * resident-rates page had not yet published a 2026-27 table when checked.
 * Bases recomputed from the 15% first rate; cross-checked against ATO Schedule 1
 * withholding coefficients (published 17 June 2026) which already embed the cut.
 *
 * Payday Super starts this year: the max contribution base becomes annual.
 */
export const fy2026_27: FYData = {
  fy: '2026-27',
  startYear: 2026,

  residentBrackets: [
    { min: 0, rate: 0, base: 0 },
    { min: 18_200, rate: 0.15, base: 0 },
    { min: 45_000, rate: 0.3, base: 4_020 },
    { min: 135_000, rate: 0.37, base: 31_020 },
    { min: 190_000, rate: 0.45, base: 51_370 },
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
    // 2026-27 low-income thresholds not yet indexed/published; Schedule 1
    // (17 June 2026) still applies $28,011 / $35,013 for payments from 1 July 2026.
    rate: 0.02,
    lowerSingle: 28_011,
    upperSingle: 35_013,
    shadeInRate: 0.1,
  },

  mls: {
    tiers: [
      { singleFrom: 0, familyFrom: 0, rate: 0 },
      { singleFrom: 105_000, familyFrom: 210_000, rate: 0.01 },
      { singleFrom: 123_000, familyFrom: 246_000, rate: 0.0125 },
      { singleFrom: 164_000, familyFrom: 328_000, rate: 0.015 },
    ],
    perChildAfterFirst: 1_500,
  },

  stsl: {
    kind: 'marginal',
    threshold: 69_528,
    bands: [
      { over: 69_528, rate: 0.15, base: 0 },
      { over: 129_717, rate: 0.17, base: 9_028 },
    ],
    topFrom: 186_051,
    topRate: 0.1,
  },

  superRules: {
    guaranteeRate: 0.12,
    maxContributionBaseAnnual: 270_830,
    concessionalCap: 32_500,
  },

  div293: { threshold: 250_000, rate: 0.15 },

  withholding: {
    // ATO Schedule 1 coefficients for payments made from 1 July 2026
    // (QC 107116, published 17 June 2026). y = a*x - b, x = whole dollars + 0.99.
    scale1: {
      rows: [
        { lessThan: 188, a: 0.15, b: 0.15 },
        { lessThan: 371, a: 0.2084, b: 11.0185 },
        { lessThan: 515, a: 0.179, b: 0.1066 },
        { lessThan: 932, a: 0.3227, b: 74.1674 },
        { lessThan: 2_246, a: 0.32, b: 71.6508 },
        { lessThan: 3_303, a: 0.39, b: 228.8816 },
        { lessThan: Infinity, a: 0.47, b: 493.1893 },
      ],
    },
    scale2: {
      rows: [
        { lessThan: 362, a: 0, b: 0 },
        { lessThan: 538, a: 0.15, b: 54.3462 },
        { lessThan: 673, a: 0.25, b: 108.2135 },
        { lessThan: 721, a: 0.17, b: 54.3473 },
        { lessThan: 865, a: 0.179, b: 60.8377 },
        { lessThan: 1_282, a: 0.3227, b: 185.1935 },
        { lessThan: 2_596, a: 0.32, b: 181.7319 },
        { lessThan: 3_653, a: 0.39, b: 363.4627 },
        { lessThan: Infinity, a: 0.47, b: 655.7704 },
      ],
    },
    scale3: {
      rows: [
        { lessThan: 2_596, a: 0.3, b: 0.3 },
        { lessThan: 3_653, a: 0.37, b: 181.7308 },
        { lessThan: Infinity, a: 0.45, b: 474.0385 },
      ],
    },
    scale5: {
      rows: [
        { lessThan: 362, a: 0, b: 0 },
        { lessThan: 721, a: 0.15, b: 54.3462 },
        { lessThan: 865, a: 0.159, b: 60.8365 },
        { lessThan: 1_282, a: 0.3027, b: 185.1923 },
        { lessThan: 2_596, a: 0.3, b: 181.7308 },
        { lessThan: 3_653, a: 0.37, b: 363.4615 },
        { lessThan: Infinity, a: 0.45, b: 655.7692 },
      ],
    },
    scale6: {
      rows: [
        { lessThan: 362, a: 0, b: 0 },
        { lessThan: 721, a: 0.15, b: 54.3462 },
        { lessThan: 865, a: 0.159, b: 60.8365 },
        { lessThan: 908, a: 0.3027, b: 185.1923 },
        { lessThan: 1_135, a: 0.3527, b: 230.6135 },
        { lessThan: 1_282, a: 0.3127, b: 185.1923 },
        { lessThan: 2_596, a: 0.31, b: 181.7308 },
        { lessThan: 3_653, a: 0.38, b: 363.4615 },
        { lessThan: Infinity, a: 0.46, b: 655.7692 },
      ],
    },
    scale4ResidentRate: 0.47,
    scale4ForeignRate: 0.45,
  },

  hasDerivedFigures: true,

  sources: {
    brackets: {
      url: 'https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer',
      checked: '2026-08-06',
      note: 'DERIVED: 16% -> 15% from 1 July 2026 is law; bases recomputed. Replace with the ATO table when published.',
    },
    foreign: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-foreign-residents',
      checked: '2026-08-06',
      note: 'Unchanged from 2025-26: the rate cut only affects the resident 16% band.',
    },
    whm: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-working-holiday-makers',
      checked: '2026-08-06',
      note: 'Unchanged from 2025-26: WHM first rate was already 15%.',
    },
    lito: {
      url: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset',
      checked: '2026-08-06',
      note: 'Not indexed; unchanged since 2020-21.',
    },
    medicare: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld/coefficients-to-use-in-formulas-for-withholding-from-weekly-payments',
      checked: '2026-08-07',
      note: '2026-27 annual thresholds not yet published; Schedule 1 for payments from 1 July 2026 uses $28,011 / $35,013.',
    },
    mls: {
      url: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates',
      checked: '2026-08-06',
    },
    stsl: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds',
      checked: '2026-08-06',
      note: 'Table 1: 2026-27 marginal system',
    },
    super: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee',
      checked: '2026-08-06',
      note: 'Payday Super from 1 July 2026: annual max contribution base $270,830.',
    },
    concessionalCap: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps',
      checked: '2026-08-06',
      note: '$32,500 from 1 July 2026 (AWOTE indexation).',
    },
    div293: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/division-293-tax',
      checked: '2026-08-06',
    },
    withholding: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld/coefficients-to-use-in-formulas-for-withholding-from-weekly-payments',
      checked: '2026-08-07',
      note: 'Schedule 1 scales 1-6 for payments from 1 July 2026. STSL per-pay components (Schedule 8) not modelled.',
    },
  },
};
