import type { Forecast, MortgageInputs, MortgageResult } from '../engine/mortgage';
import { PERIODS_PER_YEAR } from '../engine/mortgage';
import { money } from '../engine/format';
import { LineChart } from './LineChart';

const kFmt = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M` : v >= 1_000 ? `$${Math.round(v / 1_000)}K` : `$${Math.round(v)}`;

interface ForecastCardProps {
  title: string;
  intro: string;
  forecast: Forecast;
  minYear: number;
  maxYear: number;
  maxPercent: number;
  onChange: (f: Forecast) => void;
  noun: string;
}

function ForecastSliders({ title, intro, forecast: f, minYear, maxYear, maxPercent, onChange, noun }: ForecastCardProps) {
  const slider = (
    label: string,
    yearKey: 'nearYear' | 'longYear',
    pctKey: 'nearPercent' | 'longPercent',
    yearMin: number,
    yearMax: number,
  ) => (
    <div className="forecast__row">
      <span className="forecast__label">{label}</span>
      <label className="forecast__slider">
        <span className="caption">
          In <b>{f[yearKey]}</b>
        </span>
        <input
          type="range"
          min={yearMin}
          max={yearMax}
          step={1}
          value={f[yearKey]}
          aria-label={`${label} ${noun} year`}
          onChange={(e) => onChange({ ...f, [yearKey]: Number(e.target.value) })}
        />
      </label>
      <label className="forecast__slider">
        <span className="caption">
          {noun} will be <b>{f[pctKey].toFixed(1)}%</b>
        </span>
        <input
          type="range"
          min={0}
          max={maxPercent}
          step={0.1}
          value={f[pctKey]}
          aria-label={`${label} ${noun} percent`}
          onChange={(e) => onChange({ ...f, [pctKey]: Number(e.target.value) })}
        />
      </label>
    </div>
  );

  return (
    <div className="forecast">
      <span className="overline">{title}</span>
      <p className="caption" style={{ margin: '4px 0 10px' }}>
        {intro}
      </p>
      {slider('Near term', 'nearYear', 'nearPercent', minYear + 1, minYear + Math.floor((maxYear - minYear) / 2))}
      {slider('Long term', 'longYear', 'longPercent', minYear + Math.floor((maxYear - minYear) / 2), maxYear)}
    </div>
  );
}

interface Props {
  m: MortgageInputs;
  result: MortgageResult;
  onChange: (patch: Partial<MortgageInputs>) => void;
}

export function MortgageResults({ m, result: r, onChange }: Props) {
  const perLabel =
    m.frequency === 'monthly' ? 'a month' : m.frequency === 'fortnightly' ? 'a fortnight' : 'a week';
  const endYear = m.startYear + m.termYears;
  const times = r.points.map((p) => p.t);
  const ppy = PERIODS_PER_YEAR[m.frequency];

  return (
    <>
      <section className="hero card" aria-label="Repayment summary">
        <div className="hero__top">
          <div className="hero__amount-block">
            <span className="overline">Repayments</span>
            <div className="hero__amount-row">
              <span className="hero__amount" data-testid="mortgage-repayment">
                {money(r.initialRepayment)}
              </span>
              <span className="hero__period">{perLabel}</span>
            </div>
            <span className="hero__caption">
              {money(r.loanAmount)} loan at {m.portions[0].ratePercent.toFixed(2)}% ·{' '}
              {(r.lvrAtStart * 100).toFixed(0)}% LVR · initial costs {money(r.initialCosts)}
              {m.upfrontFees === 0 ? ' (deposit only; add stamp duty in upfront fees)' : ''}
            </span>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span className="caption">Total interest</span>
              <b data-testid="total-interest">{money(r.totalInterest)}</b>
            </div>
            <div className="stat">
              <span className="caption">Total payments</span>
              <b>{money(r.totalPayments)}</b>
            </div>
            <div className="stat">
              <span className="caption">Paid off</span>
              <b>
                {r.payoffYears.toFixed(r.payoffYears % 1 < 0.05 ? 0 : 1)} yrs (
                {Math.round(m.startYear + r.payoffYears)})
              </b>
            </div>
          </div>
        </div>
        {m.extraPerPeriod > 0 && (
          <p className="note--warn" style={{ background: 'var(--pay-info-12p)', borderColor: 'var(--pay-info-main)', color: 'var(--pay-info-dark)' }}>
            Extra {money(m.extraPerPeriod)} {perLabel} pays the loan off{' '}
            {r.yearsSavedByExtras.toFixed(1)} years earlier and saves{' '}
            {money(r.interestSavedByExtras)} in interest.
          </p>
        )}
      </section>

      <section className="card" aria-label="Repayments over time">
        <span className="overline">Repayments over the loan</span>
        <p className="caption" style={{ margin: '4px 0 8px' }}>
          Principal and interest per {m.frequency.replace('ly', '')} payment; the top edge is the
          total repayment. Interest dominates early, principal late.
        </p>
        <LineChart
          ariaLabel="Repayment split over the life of the loan"
          times={times}
          series={[
            {
              label: 'Interest',
              color: '#9c5e09',
              values: r.points.map((p) => p.interest),
              stacked: true,
            },
            {
              label: 'Principal',
              color: '#3866b0',
              values: r.points.map((p) => p.principal),
              stacked: true,
            },
          ]}
          formatValue={kFmt}
          tooltipExtras={(i) => [
            `Repayment ${money(r.points[i].repayment)}`,
            `Rate ${r.points[i].ratePercent.toFixed(2)}%`,
            `Owing ${kFmt(r.points[i].balance)}`,
          ]}
        />
        <ForecastSliders
          title="Interest rate forecast"
          intro="Drag the anchors to see how future variable rates change repayments. Fixed portions hold their rate until the fixed period ends."
          forecast={m.rateForecast}
          minYear={m.startYear}
          maxYear={endYear}
          maxPercent={12}
          noun="rates"
          onChange={(rateForecast) => onChange({ rateForecast })}
        />
      </section>

      <section className="card" aria-label="Property value and equity">
        <span className="overline">Property value and equity</span>
        <p className="caption" style={{ margin: '4px 0 8px' }}>
          Equity is the market value minus what you still owe.
        </p>
        <LineChart
          ariaLabel="Projected market value and equity"
          times={times}
          series={[
            {
              label: 'Market value',
              color: '#3866b0',
              values: r.points.map((p) => p.propertyValue),
            },
            { label: 'Equity', color: '#00acc1', values: r.points.map((p) => p.equity) },
          ]}
          formatValue={kFmt}
          tooltipExtras={(i) => [`LVR ${(r.points[i].lvr * 100).toFixed(0)}%`]}
        />
        <div className="stat-row" style={{ marginTop: 8 }}>
          <div className="stat">
            <span className="caption">Value in {Math.round(m.startYear + r.payoffYears)}</span>
            <b>{money(r.endPropertyValue)}</b>
          </div>
          <div className="stat">
            <span className="caption">Equity at payoff</span>
            <b>{money(r.endEquity)}</b>
          </div>
          <div className="stat">
            <span className="caption">Repayments per year</span>
            <b>{ppy}</b>
          </div>
        </div>
        <ForecastSliders
          title="Property market forecast"
          intro="Drag the anchors to see how growth assumptions change your equity."
          forecast={m.growthForecast}
          minYear={m.startYear}
          maxYear={endYear}
          maxPercent={10}
          noun="growth"
          onChange={(growthForecast) => onChange({ growthForecast })}
        />
      </section>

      <p className="caption disclaimer">
        Repayments re-amortise over the remaining term whenever the variable rate moves, the way
        lenders adjust them. Forecasts are your assumptions, not predictions. Rates compound per
        repayment period; fees, offset accounts, redraw, LMI and tax treatment of investment
        properties are not modelled. Not financial advice.
      </p>
    </>
  );
}
