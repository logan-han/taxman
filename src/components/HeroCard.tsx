import type { CalculationResult } from '../engine/calculate';
import { money } from '../engine/format';
import { ToggleGroup } from './controls';
import type { ViewPeriod } from './view';
import { VIEW_DIVISOR, VIEW_OPTIONS, VIEW_PERIOD_LABEL } from './view';

interface Props {
  result: CalculationResult;
  view: ViewPeriod;
  onViewChange: (view: ViewPeriod) => void;
}

export function HeroCard({ result: r, view, onViewChange }: Props) {
  const d = VIEW_DIVISOR[view];

  const segments = [
    { label: 'Take-home', color: 'var(--pay-primary-main)', value: r.takeHome },
    { label: 'Income tax', color: 'var(--pay-secondary-main)', value: r.netIncomeTax },
    { label: 'Medicare', color: 'var(--pay-info-main)', value: r.medicareLevy + r.medicareSurcharge },
    { label: 'Study loan', color: 'var(--pay-warning-main)', value: r.studentLoanRepayment },
    { label: 'Super sacrifice', color: 'var(--pay-bonus-main)', value: r.salarySacrificeSuper },
  ].filter((s) => s.value > 0);
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <section className="hero card" aria-label="Take-home pay">
      <div className="hero__top">
        <div className="hero__amount-block">
          <span className="overline">Take-home pay</span>
          <div className="hero__amount-row">
            <span className="hero__amount" data-testid="take-home">
              {money(r.takeHome / d)}
            </span>
            <span className="hero__period">{VIEW_PERIOD_LABEL[view]}</span>
          </div>
          <span className="hero__caption">
            {money(r.takeHome)} a year, after {money(r.totalTax)} in tax and deductions
          </span>
        </div>
        <ToggleGroup
          ariaLabel="Amounts shown per"
          options={VIEW_OPTIONS}
          value={view}
          onChange={onViewChange}
        />
      </div>

      <div className="hero__viz">
        <div
          className="hero__bar"
          role="img"
          aria-label={`Of ${money(total)}, ${money(r.takeHome)} is take-home`}
        >
          {segments.map((s) => (
            <span
              key={s.label}
              style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            />
          ))}
        </div>
        <div className="hero__legend">
          {segments.map((s) => (
            <div className="hero__legend-item" key={s.label}>
              <i style={{ background: s.color }} />
              <span>{s.label}</span>
              <b>{money(s.value / d)}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
