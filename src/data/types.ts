/**
 * All monetary values are annual AUD unless a field name says otherwise.
 *
 * Every FYData figure must carry provenance: the ATO page it came from and the
 * date it was checked. See each fy*.ts file's `sources` map.
 */

export type FinancialYear = '2024-25' | '2025-26' | '2026-27';

export type TaxCategory = 'resident' | 'residentNoTFT' | 'foreign' | 'whm';

/** tax = base + rate * (income - min), for the bracket where income >= min */
export interface Bracket {
  min: number;
  rate: number;
  base: number;
}

export interface LitoRules {
  /** maximum offset, at or below firstTaperFrom */
  max: number;
  firstTaperFrom: number;
  firstTaperRate: number;
  secondTaperFrom: number;
  /** offset remaining at secondTaperFrom */
  secondTaperBase: number;
  secondTaperRate: number;
  cutOut: number;
}

export interface MedicareRules {
  rate: number;
  /** single low-income thresholds: no levy at/below lower, 10% shade-in to upper */
  lowerSingle: number;
  upperSingle: number;
  /** shade-in rate applied to (taxable - lower) between the thresholds */
  shadeInRate: number;
}

export interface MlsTier {
  /** tier applies when income for MLS purposes > these (base tier has rate 0) */
  singleFrom: number;
  familyFrom: number;
  rate: number;
}

export interface MlsRules {
  tiers: MlsTier[];
  /** family threshold uplift per MLS dependent child after the first */
  perChildAfterFirst: number;
}

/** FY2024-25 and earlier: flat rate on TOTAL repayment income by band */
export interface StslFlat {
  kind: 'flat';
  bands: { from: number; rate: number }[];
}

/** FY2025-26 onwards: marginal bands, with the top band a flat % of total income */
export interface StslMarginal {
  kind: 'marginal';
  /** no repayment at or below this */
  threshold: number;
  bands: { over: number; rate: number; base: number }[];
  /** at/above this, repayment = topRate * total repayment income */
  topFrom: number;
  topRate: number;
}

export type StslRules = StslFlat | StslMarginal;

export interface SuperRules {
  guaranteeRate: number;
  /** quarterly cap on the earnings base (up to FY2025-26) */
  maxContributionBaseQuarterly?: number;
  /** annual cap on the earnings base (Payday Super, FY2026-27 onwards) */
  maxContributionBaseAnnual?: number;
  concessionalCap: number;
}

export interface Div293Rules {
  threshold: number;
  rate: number;
}

/**
 * ATO Schedule 1 withholding coefficients: y = a*x - b where x is whole-dollar
 * weekly earnings + 0.99. Rows sorted ascending; a row matches when x < lessThan
 * (the last row uses Infinity).
 */
export interface WithholdingScale {
  rows: { lessThan: number; a: number; b: number }[];
}

export interface WithholdingRules {
  /** scale 2: tax-free threshold claimed */
  scale2: WithholdingScale;
  /** scale 1: tax-free threshold not claimed */
  scale1: WithholdingScale;
  /** scale 3: foreign resident */
  scale3: WithholdingScale;
  /** scale 5: full Medicare levy exemption */
  scale5: WithholdingScale;
  /** scale 6: half Medicare levy exemption */
  scale6: WithholdingScale;
  /** scale 4: no TFN - flat rate, cents ignored */
  scale4ResidentRate: number;
  scale4ForeignRate: number;
}

export interface FYData {
  fy: FinancialYear;
  /** first day of the FY, for labels */
  startYear: number;
  residentBrackets: Bracket[];
  foreignBrackets: Bracket[];
  whmBrackets: Bracket[];
  lito: LitoRules;
  medicare: MedicareRules;
  mls: MlsRules;
  stsl: StslRules;
  superRules: SuperRules;
  div293: Div293Rules;
  /** Schedule 1 coefficients where captured (currently FY2026-27 only) */
  withholding?: WithholdingRules;
  /** true when any figure is derived from legislation rather than a published ATO table */
  hasDerivedFigures: boolean;
  sources: Record<string, { url: string; checked: string; note?: string }>;
}
