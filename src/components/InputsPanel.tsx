import type { FinancialYear, TaxCategory } from '../data';
import type { CalculatorInputs, PayCycle } from '../engine/calculate';
import { AmountInput, Field, Switch, ToggleGroup } from './controls';

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
        helper={inputs.salaryIncludesSuper ? 'Package including super' : 'Excluding super'}
      >
        <AmountInput
          aria-label="Pay amount"
          value={inputs.salary}
          placeholder="90,000"
          onValueChange={(salary) => onChange({ salary })}
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
          hint="Family thresholds for the levy and surcharge"
          checked={inputs.hasSpouse}
          onChange={(v) => onChange({ hasSpouse: v })}
        />

        {inputs.hasSpouse && (
          <Field label="Spouse income (a year)">
            <AmountInput
              value={inputs.spouseIncome}
              placeholder="0"
              onValueChange={(spouseIncome) => onChange({ spouseIncome })}
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
              onChange={(e) => onChange({ dependants: Math.max(0, Number(e.target.value) || 0) })}
            />
          </Field>
        </div>

        <Field label="Salary sacrifice to super (a year)">
          <AmountInput
            value={inputs.salarySacrificeSuper}
            placeholder="0"
            onValueChange={(salarySacrificeSuper) => onChange({ salarySacrificeSuper })}
          />
        </Field>

        <Field label="Other deductions (a year)">
          <AmountInput
            value={inputs.deductions}
            placeholder="0"
            onValueChange={(deductions) => onChange({ deductions })}
          />
        </Field>
      </div>

      <button type="button" className="inputs__reset" onClick={onReset}>
        Reset everything
      </button>
    </form>
  );
}
