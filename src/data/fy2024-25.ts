import type { FYData } from './types';

/**
 * FY 2024-25 (1 July 2024 - 30 June 2025).
 * Last year of the flat-rate STSL system and the 11.5% super guarantee.
 */
export const fy2024_25: FYData = {
  fy: '2024-25',
  startYear: 2024,

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
    lowerSingle: 27_222,
    upperSingle: 34_027,
    shadeInRate: 0.1,
  },

  mls: {
    tiers: [
      { singleFrom: 0, familyFrom: 0, rate: 0 },
      { singleFrom: 97_000, familyFrom: 194_000, rate: 0.01 },
      { singleFrom: 113_000, familyFrom: 226_000, rate: 0.0125 },
      { singleFrom: 151_000, familyFrom: 302_000, rate: 0.015 },
    ],
    perChildAfterFirst: 1_500,
  },

  stsl: {
    kind: 'flat',
    bands: [
      { from: 54_435, rate: 0.01 },
      { from: 62_851, rate: 0.02 },
      { from: 66_621, rate: 0.025 },
      { from: 70_619, rate: 0.03 },
      { from: 74_856, rate: 0.035 },
      { from: 79_347, rate: 0.04 },
      { from: 84_108, rate: 0.045 },
      { from: 89_155, rate: 0.05 },
      { from: 94_504, rate: 0.055 },
      { from: 100_175, rate: 0.06 },
      { from: 106_186, rate: 0.065 },
      { from: 112_557, rate: 0.07 },
      { from: 119_310, rate: 0.075 },
      { from: 126_468, rate: 0.08 },
      { from: 134_057, rate: 0.085 },
      { from: 142_101, rate: 0.09 },
      { from: 150_627, rate: 0.095 },
      { from: 159_664, rate: 0.1 },
    ],
  },

  superRules: {
    guaranteeRate: 0.115,
    maxContributionBaseQuarterly: 65_070,
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
      url: 'https://www.ato.gov.au/individuals-and-families/your-tax-return/instructions-to-complete-your-tax-return/mytax-instructions/2025/medicare-and-private-health-insurance/medicare-levy-reduction-or-exemption',
      checked: '2026-08-07',
      note: 'myTax 2025 instructions, Table 2: single lower $27,222, upper $34,027',
    },
    mls: {
      url: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates',
      checked: '2026-08-06',
    },
    stsl: {
      url: 'https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds',
      checked: '2026-08-06',
      note: 'Table 3: flat rate on total repayment income',
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
