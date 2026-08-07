import type { FYData, TaxCategory, WithholdingScale } from '../data';
import type { CalculatorInputs } from './calculate';

export type WithholdingFrequency = 'weekly' | 'fortnightly' | 'monthly';

/**
 * ATO Schedule 1 PAYG withholding: y = a*x - b on weekly-equivalent earnings.
 *
 * Rules implemented exactly as published (QC 107116):
 * - x = whole dollars of weekly earnings, plus 99 cents (truncate then add).
 * - Fortnightly: divide by 2, truncate cents, add 99c; multiply result by 2.
 * - Monthly: if cents are exactly .33 add one cent first; multiply by 3, divide
 *   by 13, truncate cents, add 99c; multiply result by 13/3 and round.
 * - Round the weekly amount to the nearest dollar, 50c rounds up.
 * - Scale 4 (no TFN): flat rate, cents ignored, no 99c step, no rounding up.
 *
 * The STSL per-pay component (Schedule 8) is NOT modelled; annual STSL is
 * computed in calculate.ts.
 */

function roundToDollar(v: number): number {
  return Math.floor(v + 0.5);
}

function weeklyWithholding(weeklyEarnings: number, scale: WithholdingScale): number {
  const x = Math.floor(weeklyEarnings) + 0.99;
  let row = scale.rows[scale.rows.length - 1];
  for (const r of scale.rows) {
    if (x < r.lessThan) {
      row = r;
      break;
    }
  }
  if (row.a === 0 && row.b === 0) return 0;
  return roundToDollar(row.a * x - row.b);
}

export function scaleFor(
  category: TaxCategory,
  medicareExemption: CalculatorInputs['medicareExemption'],
  fy: FYData,
): WithholdingScale | null {
  const w = fy.withholding;
  if (!w) return null;
  if (category === 'foreign') return w.scale3;
  if (category === 'whm') return null; // Schedule 15, not Schedule 1
  if (category === 'residentNoTFT') return w.scale1;
  if (medicareExemption === 'full') return w.scale5;
  if (medicareExemption === 'half') return w.scale6;
  return w.scale2;
}

export interface PerPayWithholding {
  frequency: WithholdingFrequency;
  grossPerPay: number;
  withheldPerPay: number;
  netPerPay: number;
  annualisedWithholding: number;
}

/**
 * Per-pay PAYG withholding for a given annual cash salary (after salary
 * sacrifice, which reduces earnings subject to withholding).
 */
export function withholdingFor(
  annualCashEarnings: number,
  frequency: WithholdingFrequency,
  scale: WithholdingScale,
): PerPayWithholding {
  const periods = frequency === 'weekly' ? 52 : frequency === 'fortnightly' ? 26 : 12;
  const grossPerPay = annualCashEarnings / periods;

  let withheld: number;
  if (frequency === 'weekly') {
    withheld = weeklyWithholding(grossPerPay, scale);
  } else if (frequency === 'fortnightly') {
    const weekly = Math.floor(grossPerPay / 2 * 100) / 100;
    withheld = weeklyWithholding(weekly, scale) * 2;
  } else {
    // monthly
    let m = Math.round(grossPerPay * 100) / 100;
    const cents = Math.round((m - Math.floor(m)) * 100);
    if (cents === 33) m += 0.01;
    const weekly = (m * 3) / 13;
    const weeklyWithheld = weeklyWithholding(weekly, scale);
    withheld = Math.round((weeklyWithheld * 13) / 3);
  }

  return {
    frequency,
    grossPerPay,
    withheldPerPay: withheld,
    netPerPay: grossPerPay - withheld,
    annualisedWithholding: withheld * periods,
  };
}
