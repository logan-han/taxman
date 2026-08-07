import type { AuState } from '../engine/compare';

/**
 * Transfer (stamp) duty on residential property, general rates per
 * jurisdiction. Each scale records its official source and checked date.
 *
 * Scales come in three shapes:
 * - per100: duty = base + rate x ceil((value - over) / 100)  ("per $100 or part")
 * - percent: duty = base + percent x (value - over)
 * - formula: NT's quadratic for values up to a threshold, flat % above
 *
 * First home buyer concessions are noted, not modelled - the estimate is the
 * general rate a non-exempt buyer pays.
 */

export interface DutyBracket {
  over: number;
  upTo: number | null;
  base: number;
  rate: number; // $ per $100 (per100) or fraction (percent, e.g. 0.055)
  /** rate applies to the whole value, not the excess (ACT's top bracket) */
  flatOnTotal?: boolean;
}

export type DutyScale =
  | { kind: 'per100'; brackets: DutyBracket[] }
  | { kind: 'percent'; brackets: DutyBracket[] }
  | {
      kind: 'ntFormula';
      /** D = (a x V^2 + b x V) x $1, V = value/1000, for value <= formulaUpTo */
      formulaUpTo: number;
      a: number;
      b: number;
      flat: { over: number; upTo: number | null; percent: number }[];
    };

export interface JurisdictionDuty {
  scale: DutyScale;
  /** floor applied to the computed duty */
  minimum?: number;
  source: { url: string; checked: string; effective: string };
  fhbNote: string;
}

export const STAMP_DUTY: Partial<Record<AuState, JurisdictionDuty>> = {
  NT: {
    scale: {
      kind: 'ntFormula',
      // D = (0.06571441 x V^2) + 15V, V = value/1000, up to $525,000
      formulaUpTo: 525_000,
      a: 0.06571441,
      b: 15,
      flat: [
        { over: 525_000, upTo: 3_000_000, percent: 0.0495 },
        { over: 3_000_000, upTo: 5_000_000, percent: 0.0575 },
        { over: 5_000_000, upTo: null, percent: 0.0595 },
      ],
    },
    source: {
      url: 'https://treasury.nt.gov.au/pms/tro/information/I-SD-002.pdf',
      checked: '2026-08-07',
      effective:
        'structure from 1 July 2017, verified against the official NT conveyance calculator on 2026-08-07',
    },
    fhbNote:
      'No FHB duty concession; the House and Land Package Exemption gives full duty relief on new house-and-land contracts to 30 June 2027.',
  },
  NSW: {
    scale: {
      kind: 'per100',
      brackets: [
        { over: 0, upTo: 18_000, base: 0, rate: 1.25 },
        { over: 18_000, upTo: 38_000, base: 225, rate: 1.5 },
        { over: 38_000, upTo: 103_000, base: 525, rate: 1.75 },
        { over: 103_000, upTo: 387_000, base: 1_662, rate: 3.5 },
        { over: 387_000, upTo: 1_290_000, base: 11_602, rate: 4.5 },
        { over: 1_290_000, upTo: 3_870_000, base: 52_237, rate: 5.5 },
        // premium rate for residential land over the premium threshold
        { over: 3_870_000, upTo: null, base: 194_137, rate: 7 },
      ],
    },
    minimum: 20,
    source: {
      url: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/understanding-transfer-duty/calculate-transfer-duty',
      checked: '2026-08-07',
      effective: 'FY 2026-27 (from 1 July 2026), page updated 26 June 2026',
    },
    fhbNote:
      'First Home Buyers Assistance Scheme: no duty on new or existing homes to $800,000, concessions under $1 million.',
  },
  ACT: {
    scale: {
      kind: 'per100',
      brackets: [
        { over: 0, upTo: 260_000, base: 0, rate: 0.28 },
        { over: 260_000, upTo: 300_000, base: 728, rate: 2.2 },
        { over: 300_000, upTo: 500_000, base: 1_608, rate: 3.4 },
        { over: 500_000, upTo: 750_000, base: 8_408, rate: 4.32 },
        { over: 750_000, upTo: 1_000_000, base: 19_208, rate: 5.9 },
        { over: 1_000_000, upTo: 1_455_000, base: 33_958, rate: 6.4 },
        { over: 1_455_000, upTo: null, base: 0, rate: 4.54, flatOnTotal: true },
      ],
    },
    source: {
      url: 'https://www.revenue.act.gov.au/rates-and-property-charges/conveyance-duty-stamp-duty/conveyance-duty-for-non-commercial-property',
      checked: '2026-08-07',
      effective:
        'owner-occupier rates from 1 July 2025 (unchanged for 2026-27, DI2026-155); investors pay higher non-owner-occupier rates',
    },
    fhbNote:
      'Home Buyer Concession Scheme: from 1 July 2026 eligible buyers pay $0 duty with no property value or income cap.',
  },
  SA: {
    scale: {
      kind: 'per100',
      brackets: [
        { over: 0, upTo: 12_000, base: 0, rate: 1 },
        { over: 12_000, upTo: 30_000, base: 120, rate: 2 },
        { over: 30_000, upTo: 50_000, base: 480, rate: 3 },
        { over: 50_000, upTo: 100_000, base: 1_080, rate: 3.5 },
        { over: 100_000, upTo: 200_000, base: 2_830, rate: 4 },
        { over: 200_000, upTo: 250_000, base: 6_830, rate: 4.25 },
        { over: 250_000, upTo: 300_000, base: 8_955, rate: 4.75 },
        { over: 300_000, upTo: 500_000, base: 11_330, rate: 5 },
        { over: 500_000, upTo: null, base: 21_330, rate: 5.5 },
      ],
    },
    source: {
      url: 'https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty',
      checked: '2026-08-07',
      effective: 'scale unchanged since 5 September 2002 (not indexed)',
    },
    fhbNote:
      'Eligible first home buyers of NEW homes or land pay no duty regardless of value (contracts from 6 June 2024); established homes get no relief.',
  },
  WA: {
    scale: {
      kind: 'per100',
      brackets: [
        { over: 0, upTo: 120_000, base: 0, rate: 1.9 },
        { over: 120_000, upTo: 150_000, base: 2_280, rate: 2.85 },
        { over: 150_000, upTo: 360_000, base: 3_135, rate: 3.8 },
        { over: 360_000, upTo: 725_000, base: 11_115, rate: 4.75 },
        { over: 725_000, upTo: null, base: 28_453, rate: 5.15 },
      ],
    },
    source: {
      url: 'https://www.wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty-assessment',
      checked: '2026-08-07',
      effective:
        'general rate from 1 July 2022 (same as residential rate), page updated 30 July 2026',
    },
    fhbNote:
      'First home owner rate (from 7 May 2026): nil to $600,000, concessional to $800,000.',
  },
  VIC: {
    scale: {
      kind: 'percent',
      brackets: [
        { over: 0, upTo: 25_000, base: 0, rate: 0.014 },
        { over: 25_000, upTo: 130_000, base: 350, rate: 0.024 },
        { over: 130_000, upTo: 960_000, base: 2_870, rate: 0.06 },
        // published as a flat 5.5% of the whole value in this band
        { over: 960_000, upTo: 2_000_000, base: 52_800, rate: 0.055 },
        { over: 2_000_000, upTo: null, base: 110_000, rate: 0.065 },
      ],
    },
    source: {
      url: 'https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates/land-transfer-duty-non-principal-place-residence-current-rates',
      checked: '2026-08-07',
      effective: 'contracts on or after 1 July 2021 (general, non-PPR rates)',
    },
    fhbNote:
      'Owner-occupiers get concessional rates below $550,000; first home buyers pay nil to $600,000 and reduced duty to $750,000.',
  },
  TAS: {
    scale: {
      kind: 'per100',
      brackets: [
        { over: 0, upTo: 3_000, base: 50, rate: 0 },
        { over: 3_000, upTo: 25_000, base: 50, rate: 1.75 },
        { over: 25_000, upTo: 75_000, base: 435, rate: 2.25 },
        { over: 75_000, upTo: 200_000, base: 1_560, rate: 3.5 },
        { over: 200_000, upTo: 375_000, base: 5_935, rate: 4 },
        { over: 375_000, upTo: 725_000, base: 12_935, rate: 4.25 },
        { over: 725_000, upTo: null, base: 27_810, rate: 4.5 },
      ],
    },
    source: {
      url: 'https://www.sro.tas.gov.au/property-transfer-duties/rates-of-duty',
      checked: '2026-08-07',
      effective: 'transfers on or after 21 October 2013 (current scale)',
    },
    fhbNote:
      'The 100% FHB duty exemption for established homes to $750,000 ended for settlements after 30 June 2026.',
  },
  QLD: {
    scale: {
      kind: 'per100',
      brackets: [
        { over: 0, upTo: 5_000, base: 0, rate: 0 },
        { over: 5_000, upTo: 75_000, base: 0, rate: 1.5 },
        { over: 75_000, upTo: 540_000, base: 1_050, rate: 3.5 },
        { over: 540_000, upTo: 1_000_000, base: 17_325, rate: 4.5 },
        { over: 1_000_000, upTo: null, base: 38_025, rate: 5.75 },
      ],
    },
    source: {
      url: 'https://qro.qld.gov.au/duties/transfer-duty/calculate/rates/',
      checked: '2026-08-07',
      effective: 'current rates, page last updated 25 June 2026',
    },
    fhbNote:
      'Home and first home concessions can reduce this substantially - see QRO home concession rates.',
  },
};

export function stampDutyFor(state: AuState, value: number): number | null {
  const j = STAMP_DUTY[state];
  if (!j || value <= 0) return null;
  const s = j.scale;

  if (s.kind === 'per100' || s.kind === 'percent') {
    let b = s.brackets[0];
    for (const br of s.brackets) {
      if (value > br.over) b = br;
    }
    const excess = b.flatOnTotal ? value : Math.max(0, value - b.over);
    const duty =
      s.kind === 'per100'
        ? b.base + b.rate * Math.ceil(excess / 100)
        : b.base + b.rate * excess;
    return Math.max(duty, j.minimum ?? 0);
  }

  // NT formula
  if (value <= s.formulaUpTo) {
    const v = value / 1000;
    return s.a * v * v + s.b * v;
  }
  let flat = s.flat[0];
  for (const f of s.flat) {
    if (value > f.over) flat = f;
  }
  return flat.percent * value;
}
