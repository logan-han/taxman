import type { FYData, TaxCategory } from '../data';
import type { CalculationResult } from '../engine/calculate';
import { money, percent } from '../engine/format';

interface Props {
  result: CalculationResult;
  fyData: FYData;
  category: TaxCategory;
}

const CATEGORY_NOTE: Record<TaxCategory, string> = {
  resident: 'Resident rates',
  residentNoTFT: 'Resident rates (the tax-free threshold still applies to the annual assessment)',
  foreign: 'Foreign resident rates - no tax-free threshold, no Medicare levy',
  whm: 'Working holiday maker rates (registered employer) - no Medicare levy',
};

export function BracketsCard({ result: r, fyData, category }: Props) {
  const brackets =
    category === 'foreign'
      ? fyData.foreignBrackets
      : category === 'whm'
        ? fyData.whmBrackets
        : fyData.residentBrackets;

  const marginalRate = [...brackets].reverse().find((b) => r.taxableIncome > b.min)?.rate ?? 0;
  const effectiveRate = r.taxableIncome > 0 ? r.totalTax / r.taxableIncome : 0;

  const rows = brackets.map((b, i) => {
    const next = brackets[i + 1];
    const active = r.taxableIncome > b.min;
    const slice = active
      ? b.rate * (Math.min(r.taxableIncome, next ? next.min : Infinity) - b.min)
      : 0;
    const band = next
      ? b.min === 0
        ? `${money(0)} – ${money(next.min)}`
        : `${money(b.min + 1)} – ${money(next.min)}`
      : `${money(b.min + 1)} and over`;
    return { band, rate: b.rate === 0 ? 'Nil' : percent(b.rate), slice, active };
  });

  return (
    <section className="card" aria-label="How your tax is calculated">
      <div className="section-head">
        <span className="overline">How your tax is calculated</span>
        <div className="section-head__chips">
          <span className="chip chip--info">Marginal rate {percent(marginalRate)}</span>
          <span className="chip">Effective rate {(effectiveRate * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div className="brackets">
        <div className="brackets__head">
          <span>Taxable income band</span>
          <span>Rate</span>
          <span>Tax on this band</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.band}
            className={`brackets__row${row.active ? '' : ' brackets__row--inactive'}`}
          >
            <span>{row.band}</span>
            <span>{row.rate}</span>
            <span>{money(row.active ? row.slice : 0)}</span>
          </div>
        ))}
      </div>

      <p className="caption brackets__note">
        {CATEGORY_NOTE[category]} for {fyData.fy}.
        {fyData.hasDerivedFigures &&
          ' Includes the legislated 15% rate that applied from 1 July 2026; the ATO is yet to publish its bracket table for this year.'}{' '}
        The low income tax offset and the Medicare levy low-income reduction are applied
        automatically where eligible.
      </p>
    </section>
  );
}
