import type { AuState, CompareInputs } from '../engine/compare';
import { AU_STATES, STATE_PUBLIC_HOLIDAYS } from '../engine/compare';
import { Field, Switch, ToggleGroup } from './controls';

function formatThousands(v: number): string {
  return v === 0 ? '' : v.toLocaleString('en-AU');
}

function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  compare: CompareInputs;
  onChange: (patch: Partial<CompareInputs>) => void;
  onReset: () => void;
}

export function CompareInputsPanel({ compare: c, onChange, onReset }: Props) {
  return (
    <form className="inputs card" onSubmit={(e) => e.preventDefault()}>
      <span className="overline">Contract offer</span>

      <div className="inputs__aux">
        <Field label={c.contractTimeUnit === 'daily' ? 'Day rate' : 'Hourly rate'}>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Contract rate"
            value={formatThousands(c.contractRate)}
            placeholder="700"
            onChange={(e) => onChange({ contractRate: parseAmount(e.target.value) })}
          />
        </Field>
        <Field label="Rate is per">
          <select
            aria-label="Rate unit"
            value={c.contractTimeUnit}
            onChange={(e) =>
              onChange({ contractTimeUnit: e.target.value as CompareInputs['contractTimeUnit'] })
            }
          >
            <option value="daily">Day</option>
            <option value="hourly">Hour</option>
          </select>
        </Field>
      </div>

      <Switch
        label="Rate includes super"
        checked={c.contractIncludesSuper}
        onChange={(v) => onChange({ contractIncludesSuper: v })}
      />
      <Field label="Contract super rate (%)">
        <input
          type="number"
          min="0"
          max="30"
          step="0.5"
          value={c.contractSuperPercent}
          onChange={(e) =>
            onChange({ contractSuperPercent: Math.max(0, Number(e.target.value) || 0) })
          }
        />
      </Field>

      <div className="inputs__divider" />
      <span className="overline">Permanent offer</span>

      <Field label="Annual salary">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Permanent salary"
          value={formatThousands(c.permSalary)}
          placeholder="130,000"
          onChange={(e) => onChange({ permSalary: parseAmount(e.target.value) })}
        />
      </Field>
      <Field label="Bonus (a year)">
        <input
          type="text"
          inputMode="numeric"
          value={formatThousands(c.permBonus)}
          placeholder="0"
          onChange={(e) => onChange({ permBonus: parseAmount(e.target.value) })}
        />
      </Field>
      <Switch
        label="Salary includes super"
        checked={c.permIncludesSuper}
        onChange={(v) => onChange({ permIncludesSuper: v })}
      />
      <Field label="Permanent super rate (%)">
        <input
          type="number"
          min="0"
          max="30"
          step="0.5"
          value={c.permSuperPercent}
          onChange={(e) => onChange({ permSuperPercent: Math.max(0, Number(e.target.value) || 0) })}
        />
      </Field>

      <div className="inputs__divider" />
      <span className="overline">Work year</span>

      <Field label="State or territory" helper="Sets the public holiday default below">
        <select
          aria-label="State or territory"
          value={c.state}
          onChange={(e) => {
            const state = e.target.value as AuState;
            onChange({ state, publicHolidayDays: STATE_PUBLIC_HOLIDAYS[state] });
          }}
        >
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <div className="inputs__aux">
        <Field label="Work days a year">
          <input
            type="number"
            min="0"
            max="366"
            value={c.workDaysPerYear}
            onChange={(e) =>
              onChange({ workDaysPerYear: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </Field>
        <Field label="Public holidays">
          <input
            type="number"
            min="0"
            max="366"
            value={c.publicHolidayDays}
            onChange={(e) =>
              onChange({ publicHolidayDays: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </Field>
      </div>
      <span className="caption">
        Gazetted days vary by year and region (show days, part-day holidays) - adjust to suit.
      </span>
      <div className="inputs__aux">
        <Field label="Annual leave days">
          <input
            type="number"
            min="0"
            max="366"
            value={c.annualLeaveDays}
            onChange={(e) =>
              onChange({ annualLeaveDays: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </Field>
        <Field label="Sick days">
          <input
            type="number"
            min="0"
            max="366"
            value={c.sickDays}
            onChange={(e) => onChange({ sickDays: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
      </div>
      {c.contractTimeUnit === 'hourly' && (
        <Field label="Hours per day">
          <input
            type="number"
            min="1"
            max="24"
            step="0.5"
            value={c.hoursPerDay}
            onChange={(e) => onChange({ hoursPerDay: Number(e.target.value) || 7.5 })}
          />
        </Field>
      )}

      <div className="inputs__divider" />

      <div className="inputs__switches">
        <Switch
          label="Study loan"
          hint="Applies to both offers"
          checked={c.hasStudentLoan}
          onChange={(v) => onChange({ hasStudentLoan: v })}
        />
        <Switch
          label="Private hospital cover"
          hint="Avoids the Medicare levy surcharge"
          checked={c.privateHospitalCover}
          onChange={(v) => onChange({ privateHospitalCover: v })}
        />
      </div>

      <button type="button" className="inputs__reset" onClick={onReset}>
        Reset everything
      </button>
    </form>
  );
}

export { ToggleGroup };
