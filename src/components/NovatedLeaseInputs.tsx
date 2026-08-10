import type { FinancialYear } from '../data';
import type { NovatedLeaseInputs } from '../engine/novatedLease';
import type { VehicleType } from '../data/fbt';
import { CAR_THRESHOLDS, MIN_RESIDUAL_PERCENT } from '../data/fbt';
import { money } from '../engine/format';
import { Field, Switch, ToggleGroup } from './controls';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatThousands(v: number): string {
  return v === 0 ? '' : Math.round(v).toLocaleString('en-AU');
}

function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  n: NovatedLeaseInputs;
  fy: FinancialYear;
  onChange: (patch: Partial<NovatedLeaseInputs>) => void;
  onReset: () => void;
}

export function NovatedInputsPanel({ n, fy, onChange, onReset }: Props) {
  const numeric = (v: string) => {
    const parsed = Number(v);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const thresholds = CAR_THRESHOLDS[fy];
  const financedEstimate =
    n.amountFinanced > 0
      ? n.amountFinanced
      : Math.max(0, n.carPrice - Math.min(n.carPrice / 11, thresholds.maxGstCredit));
  const minResidualPercent = MIN_RESIDUAL_PERCENT[Math.min(5, Math.max(1, n.termYears))];
  const minResidual = Math.round(financedEstimate * minResidualPercent);

  return (
    <form className="inputs card" onSubmit={(e) => e.preventDefault()}>
      <span className="overline">Copy these from the quote</span>

      <Field label="Vehicle" helper="PHEVs count as non-EV: new leases lost the exemption in 2025">
        <ToggleGroup
          ariaLabel="Vehicle type"
          options={[
            { label: 'EV', value: 'bev' as VehicleType },
            { label: 'Non-EV', value: 'ice' as VehicleType },
          ]}
          value={n.vehicleType}
          onChange={(v) => onChange({ vehicleType: v })}
        />
      </Field>

      <Field label="Car price" helper="The quoted vehicle price">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Car price"
          value={formatThousands(n.carPrice)}
          placeholder="90,417"
          onChange={(e) => onChange({ carPrice: parseAmount(e.target.value) })}
        />
      </Field>

      <Field label="Finance payment (a fortnight)">
        <input
          type="number"
          min="0"
          step="0.01"
          aria-label="Finance per fortnight"
          value={n.financePerFortnight}
          onChange={(e) => onChange({ financePerFortnight: numeric(e.target.value) })}
        />
      </Field>

      <Field
        label="Running costs (a fortnight)"
        helper="Sum of the quote's inclusions: rego, insurance, servicing, tyres, energy"
      >
        <input
          type="number"
          min="0"
          step="0.01"
          aria-label="Running costs per fortnight"
          value={n.runningPerFortnight}
          onChange={(e) => onChange({ runningPerFortnight: numeric(e.target.value) })}
        />
      </Field>

      <div className="inputs__aux">
        <Field label="Term (years)">
          <input
            type="number"
            min="1"
            max="5"
            value={n.termYears}
            onChange={(e) =>
              onChange({ termYears: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })
            }
          />
        </Field>
      </div>

      <Field label="Residual value" helper="The balloon you owe at the end, as quoted">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Residual value"
          value={formatThousands(n.residual)}
          placeholder="19,310"
          onChange={(e) => onChange({ residual: parseAmount(e.target.value) })}
        />
      </Field>
      <span className="caption">
        ATO floor for {n.termYears} year{n.termYears > 1 ? 's' : ''} is{' '}
        {(minResidualPercent * 100).toFixed(2)}% of the amount financed:{' '}
        <b data-testid="min-residual">{money(minResidual)}</b>{' '}
        <button
          type="button"
          className="inputs__reset"
          style={{ display: 'inline' }}
          onClick={() => onChange({ residual: minResidual })}
        >
          use ATO minimum
        </button>
        <br />
        Providers may quote higher (smaller fortnightly, bigger balloon), never lower.
      </span>
      <Switch
        label="Residual shown inc GST"
        hint="Most quotes show it ex GST and add 10% when you buy"
        checked={n.residualIncludesGst}
        onChange={(v) => onChange({ residualIncludesGst: v })}
      />

      <div className="inputs__aux">
        <Field label="Lease starts">
          <select
            aria-label="Lease start month"
            value={n.startMonth}
            onChange={(e) => onChange({ startMonth: Number(e.target.value) })}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input
            type="number"
            min="2022"
            max="2035"
            aria-label="Lease start year"
            value={n.startYear}
            onChange={(e) => onChange({ startYear: Number(e.target.value) || 2026 })}
          />
        </Field>
      </div>

      <div className="inputs__divider" />
      <span className="overline">Fine print</span>

      <Field
        label="Amount financed"
        helper="Only if the quote discloses it; 0 estimates price less the GST credit"
      >
        <input
          type="text"
          inputMode="numeric"
          aria-label="Amount financed"
          value={formatThousands(n.amountFinanced)}
          placeholder="0"
          onChange={(e) => onChange({ amountFinanced: parseAmount(e.target.value) })}
        />
      </Field>
      <Field
        label="FBT base value"
        helper="Drive-away less government on-roads, if shown; 0 uses car price"
      >
        <input
          type="text"
          inputMode="numeric"
          aria-label="FBT base value"
          value={formatThousands(n.fbtBaseValue)}
          placeholder="0"
          onChange={(e) => onChange({ fbtBaseValue: parseAmount(e.target.value) })}
        />
      </Field>
      <Switch
        label="Luxury adjustment passed on"
        hint="Div 242 charge above the car limit; some employers absorb it"
        checked={n.lvaPassedOn}
        onChange={(v) => onChange({ lvaPassedOn: v })}
      />

      <div className="inputs__divider" />
      <span className="overline">You</span>

      <Field label="Salary (a year)">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Salary"
          value={formatThousands(n.salary)}
          placeholder="100,000"
          onChange={(e) => onChange({ salary: parseAmount(e.target.value) })}
        />
      </Field>
      <div className="inputs__switches">
        <Switch
          label="Study loan"
          hint="HELP, VSL or other STSL debt"
          checked={n.hasStudentLoan}
          onChange={(v) => onChange({ hasStudentLoan: v })}
        />
        <Switch
          label="Private hospital cover"
          checked={n.privateHospitalCover}
          onChange={(v) => onChange({ privateHospitalCover: v })}
        />
      </div>

      <div className="inputs__divider" />
      <span className="overline">Your alternatives</span>

      <div className="inputs__aux">
        <Field label="Car loan rate (%)">
          <input
            type="number"
            min="0"
            max="30"
            step="0.1"
            aria-label="Car loan rate"
            value={n.carLoanRatePercent}
            onChange={(e) => onChange({ carLoanRatePercent: numeric(e.target.value) })}
          />
        </Field>
        <Field label="Mortgage rate (%)">
          <input
            type="number"
            min="0"
            max="25"
            step="0.1"
            aria-label="Mortgage rate"
            value={n.mortgageRatePercent}
            onChange={(e) => onChange({ mortgageRatePercent: numeric(e.target.value) })}
          />
        </Field>
      </div>
      <span className="caption">
        The mortgage rate is also the opportunity cost of your own cash (offset money).
      </span>

      <button type="button" className="inputs__reset" onClick={onReset}>
        Reset everything
      </button>
    </form>
  );
}
