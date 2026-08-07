import type { FinancialYear, TaxCategory } from '../data';
import type { CalculatorInputs, PayCycle } from '../engine/calculate';
import { Field, Switch, ToggleGroup } from './controls';

const CYCLE_OPTIONS: { label: string; value: PayCycle }[] = [
  { label: 'A year', value: 'annual' },
  { label: 'A month', value: 'monthly' },
  { label: 'A fortnight', value: 'fortnightly' },
  { label: 'A week', value: 'weekly' },
  { label: 'A day', value: 'daily' },
  { label: 'An hour', value: 'hourly' },
];

const CATEGORY_OPTIONS: { label: string; value: TaxCategory }[] = [
  { label: 'Australian resident', value: 'resident' },
  { label: 'Resident, no tax-free threshold', value: 'residentNoTFT' },
  { label: 'Foreign resident', value: 'foreign' },
  { label: 'Working holiday maker (417/462)', value: 'whm' },
];

function formatThousands(v: number): string {
  return v === 0 ? '' : v.toLocaleString('en-AU');
}

function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

interface Props {
  inputs: CalculatorInputs;
  fy: FinancialYear;
  onChange: (patch: Partial<CalculatorInputs>) => void;
  onReset: () => void;
}

export function InputsPanel({ inputs, onChange, onReset }: Props) {
  return (
    <form className="inputs card" onSubmit={(e) => e.preventDefault()}>
      <span className="overline">Your pay</span>

      <Field
        label="Salary before tax"
        helper={
          inputs.salaryIncludesSuper ? 'Package including super' : 'Excluding super'
        }
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Pay amount"
          value={formatThousands(inputs.salary)}
          placeholder="90,000"
          onChange={(e) => onChange({ salary: parseAmount(e.target.value) })}
        />
      </Field>

      <Field label="You entered this as">
        <select
          aria-label="Pay cycle"
          value={inputs.payCycle}
          onChange={(e) => onChange({ payCycle: e.target.value as PayCycle })}
        >
          {CYCLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {inputs.payCycle === 'hourly' && (
        <Field label="Hours per week">
          <input
            type="number"
            min="1"
            max="168"
            value={inputs.hoursPerWeek}
            onChange={(e) => onChange({ hoursPerWeek: Number(e.target.value) || 38 })}
          />
        </Field>
      )}
      {inputs.payCycle === 'daily' && (
        <Field label="Days per week">
          <input
            type="number"
            min="1"
            max="7"
            value={inputs.daysPerWeek}
            onChange={(e) => onChange({ daysPerWeek: Number(e.target.value) || 5 })}
          />
        </Field>
      )}

      <div className="inputs__divider" />

      <div className="inputs__switches">
        <Switch
          label="Salary includes super"
          checked={inputs.salaryIncludesSuper}
          onChange={(v) => onChange({ salaryIncludesSuper: v })}
        />
        <Switch
          label="Study loan"
          hint="HELP, VSL, SFSS, SSL, AASL"
          checked={inputs.hasStudentLoan}
          onChange={(v) => onChange({ hasStudentLoan: v })}
        />
        {(inputs.category === 'resident' || inputs.category === 'residentNoTFT') && (
          <>
            <Switch
              label="Medicare levy exemption"
              checked={inputs.medicareExemption !== 'none'}
              onChange={(v) => onChange({ medicareExemption: v ? 'full' : 'none' })}
            />
            {inputs.medicareExemption !== 'none' && (
              <ToggleGroup
                ariaLabel="Medicare exemption level"
                options={[
                  { label: 'Full exemption', value: 'full' },
                  { label: 'Half exemption', value: 'half' },
                ]}
                value={inputs.medicareExemption}
                onChange={(v) => onChange({ medicareExemption: v })}
              />
            )}
          </>
        )}
      </div>

      <div className="inputs__divider" />

      <div className="inputs__more">
        <span className="overline">More options</span>

        <Field label="Tax status">
          <select
            value={inputs.category}
            onChange={(e) => onChange({ category: e.target.value as TaxCategory })}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Switch
          label="Private hospital cover"
          hint="Avoids the Medicare levy surcharge"
          checked={inputs.privateHospitalCover}
          onChange={(v) => onChange({ privateHospitalCover: v })}
        />

        <Switch
          label="Spouse"
          hint="Surcharge uses family thresholds"
          checked={inputs.hasSpouse}
          onChange={(v) => onChange({ hasSpouse: v })}
        />

        {inputs.hasSpouse && (
          <Field label="Spouse income (a year)">
            <input
              type="text"
              inputMode="numeric"
              value={formatThousands(inputs.spouseIncome)}
              placeholder="0"
              onChange={(e) => onChange({ spouseIncome: parseAmount(e.target.value) })}
            />
          </Field>
        )}

        <div className="inputs__aux">
          <Field label="Dependent children">
            <input
              type="number"
              min="0"
              max="20"
              value={inputs.dependants}
              onChange={(e) =>
                onChange({ dependants: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </Field>
        </div>

        <Field label="Salary sacrifice to super (a year)">
          <input
            type="text"
            inputMode="numeric"
            value={formatThousands(inputs.salarySacrificeSuper)}
            placeholder="0"
            onChange={(e) => onChange({ salarySacrificeSuper: parseAmount(e.target.value) })}
          />
        </Field>

        <Field label="Other deductions (a year)">
          <input
            type="text"
            inputMode="numeric"
            value={formatThousands(inputs.deductions)}
            placeholder="0"
            onChange={(e) => onChange({ deductions: parseAmount(e.target.value) })}
          />
        </Field>
      </div>

      <button type="button" className="inputs__reset" onClick={onReset}>
        Reset everything
      </button>
    </form>
  );
}
