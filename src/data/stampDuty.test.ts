import { describe, it, expect } from 'vitest';
import { stampDutyFor } from './stampDuty';

describe('stamp duty', () => {
  it("QLD worked example from QRO: $850,000 investment property -> $31,275", () => {
    // "$17,325 (for the first $540,000) + $13,950 ($4.50 for every $100 in
    //  $310,000, the balance above $540,000) = $31,275"
    expect(stampDutyFor('QLD', 850_000)).toBe(31_275);
  });

  it('QLD nil under $5,000 and part-of-$100 rounds up', () => {
    expect(stampDutyFor('QLD', 4_999)).toBe(0);
    // $5,050: $1.50 for each $100 or part over $5,000 -> 1 part -> $1.50
    expect(stampDutyFor('QLD', 5_050)).toBe(1.5);
  });

  it('NSW FY2026-27: $1,000,000 -> $39,187', () => {
    // $11,602 + $4.50 x 6,130 parts of $100 over $387,000
    expect(stampDutyFor('NSW', 1_000_000)).toBe(39_187);
  });

  it('NSW minimum duty of $20 applies at the bottom', () => {
    expect(stampDutyFor('NSW', 1_000)).toBe(20);
  });

  it('NSW premium rate above $3,870,000', () => {
    // 194,137 + 7 x ceil(130,000/100)
    expect(stampDutyFor('NSW', 4_000_000)).toBe(194_137 + 7 * 1_300);
  });

  it('TAS: $600,000 -> $22,497.50', () => {
    expect(stampDutyFor('TAS', 600_000)).toBeCloseTo(12_935 + 4.25 * 2_250, 2);
  });

  it('TAS flat $50 at or below $3,000', () => {
    expect(stampDutyFor('TAS', 2_000)).toBe(50);
  });

  it('VIC general: $700,000 -> $37,070; $1M band is flat 5.5%', () => {
    // 2,870 + 6% x 570,000
    expect(stampDutyFor('VIC', 700_000)).toBeCloseTo(2_870 + 0.06 * 570_000, 2);
    // published as 5.5% of the whole value in the 960k-2M band
    expect(stampDutyFor('VIC', 1_000_000)).toBeCloseTo(0.055 * 1_000_000, 2);
  });

  it('WA general: $500,000 -> $17,765', () => {
    // 11,115 + 4.75 x 1,400 parts of $100 over $360,000
    expect(stampDutyFor('WA', 500_000)).toBe(11_115 + 4.75 * 1_400);
  });

  it('ACT owner-occupier: bracket bases are continuous and the top is flat on total', () => {
    // at 750,000: 8,408 + 4.32 x 2,500 = 19,208 = next bracket's base
    expect(stampDutyFor('ACT', 750_000)).toBe(19_208);
    expect(stampDutyFor('ACT', 800_000)).toBe(19_208 + 5.9 * 500);
    // flat $4.54 per $100 of the TOTAL value above $1,455,000
    expect(stampDutyFor('ACT', 1_500_000)).toBe(4.54 * 15_000);
  });

  it('SA (unchanged since 2002): $700,000 -> $32,330', () => {
    expect(stampDutyFor('SA', 700_000)).toBe(21_330 + 5.5 * 2_000);
  });

  it('NT formula matches the official calculator fixtures', () => {
    // live NT government calculator results, checked 2026-08-07
    expect(stampDutyFor('NT', 500_000)).toBeCloseTo(23_928.6, 1);
    expect(stampDutyFor('NT', 600_000)).toBeCloseTo(29_700, 2);
    expect(stampDutyFor('NT', 4_000_000)).toBeCloseTo(230_000, 2);
    expect(stampDutyFor('NT', 6_000_000)).toBeCloseTo(357_000, 2);
  });

  it('every jurisdiction has data and a source', async () => {
    const { STAMP_DUTY } = await import('./stampDuty');
    const { AU_STATES } = await import('../engine/compare');
    for (const s of AU_STATES) {
      expect(STAMP_DUTY[s], s).toBeDefined();
      expect(STAMP_DUTY[s]!.source.url).toMatch(/^https:\/\//);
      expect(STAMP_DUTY[s]!.source.checked).toBe('2026-08-07');
    }
  });
});
