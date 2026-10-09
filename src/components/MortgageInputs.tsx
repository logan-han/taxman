import type { AuState } from '../engine/compare';
import { AU_STATES } from '../engine/compare';
import type { InterestOption, MortgageInputs, RepaymentFrequency } from '../engine/mortgage';
import { STAMP_DUTY, stampDutyFor } from '../data/stampDuty';
import { money } from '../engine/format';
import { AmountInput, Field, Switch, formatAmount } from './controls';

const OPTION_LABELS: Record<InterestOption, string> = {
  variable: 'Variable',
  fixed6m: '6 months fixed',
  fixed1y: '1 year fixed',
  fixed2y: '2 years fixed',
  fixed3y: '3 years fixed',
  fixed5y: '5 years fixed',
  fixedFull: 'Full term fixed',
  interestOnly: 'Interest only',
};

const FREQ_LABELS: Record<RepaymentFrequency, string> = {
  monthly: 'Monthly',
  fortnightly: 'Fortnightly',
  weekly: 'Weekly',
};

interface Props {
  m: MortgageInputs;
  onChange: (patch: Partial<MortgageInputs>) => void;
  onReset: () => void;
}

export function MortgageInputsPanel({ m, onChange, onReset }: Props) {
  const loanAmount = (m.split ? m.portions : m.portions.slice(0, 1)).reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  const lvr = m.propertyValue > 0 ? (loanAmount / m.propertyValue) * 100 : 0;

  const setPortion = (index: 0 | 1, patch: Partial<MortgageInputs['portions'][0]>) => {
    const portions = m.portions.map((p, i) => (i === index ? { ...p, ...patch } : p)) as [
      MortgageInputs['portions'][0],
      MortgageInputs['portions'][1],
    ];
    onChange({ portions });
  };

  const setDeposit = (deposit: number) => {
    const loan = Math.max(0, m.propertyValue - deposit);
    onChange({ deposit });
    setPortionAmounts(loan);
  };

  const setPortionAmounts = (loan: number) => {
    if (m.split) {
      const second = Math.min(m.portions[1].amount, loan);
      onChange({
        portions: [
          { ...m.portions[0], amount: loan - second },
          { ...m.portions[1], amount: second },
        ],
      });
    } else {
      onChange({
        portions: [{ ...m.portions[0], amount: loan }, m.portions[1]],
      });
    }
  };

  return (
    <form className="inputs card" onSubmit={(e) => e.preventDefault()}>
      <span className="overline">Loan details</span>

      <Switch
        label="Existing mortgage"
        hint="Charts start from your original start date"
        checked={m.existing}
        onChange={(v) => onChange({ existing: v })}
      />

      {m.existing && (
        <div className="inputs__aux">
          <Field label="Start year">
            <input
              type="number"
              min="1990"
              max="2050"
              value={m.startYear}
              onChange={(e) => onChange({ startYear: Number(e.target.value) || 2026 })}
            />
          </Field>
          <Field label="Start month">
            <input
              type="number"
              min="1"
              max="12"
              value={m.startMonth}
              onChange={(e) =>
                onChange({ startMonth: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })
              }
            />
          </Field>
        </div>
      )}

      <Field label="Property value">
        <AmountInput
          aria-label="Property value"
          value={m.propertyValue}
          placeholder="1,000,000"
          onValueChange={(propertyValue) => {
            onChange({ propertyValue });
            if (!m.existing) setPortionAmounts(Math.max(0, propertyValue - m.deposit));
          }}
        />
      </Field>

      {!m.existing && (
        <Field
          label="Deposit"
          helper={`Loan ${formatAmount(Math.round(loanAmount)) || 0} · LVR ${lvr.toFixed(0)}%`}
        >
          <AmountInput
            aria-label="Deposit"
            value={m.deposit}
            placeholder="200,000"
            onValueChange={setDeposit}
          />
        </Field>
      )}

      {m.existing && (
        <Field label="Loan amount" helper={`LVR ${lvr.toFixed(0)}%`}>
          <AmountInput
            aria-label="Loan amount"
            value={loanAmount}
            onValueChange={setPortionAmounts}
          />
        </Field>
      )}

      <div className="inputs__aux">
        <Field label="Term (years)">
          <input
            type="number"
            min="1"
            max="40"
            value={m.termYears}
            onChange={(e) =>
              onChange({ termYears: Math.min(40, Math.max(1, Number(e.target.value) || 30)) })
            }
          />
        </Field>
        <Field label="Repayments">
          <select
            aria-label="Repayment frequency"
            value={m.frequency}
            onChange={(e) => onChange({ frequency: e.target.value as RepaymentFrequency })}
          >
            {Object.entries(FREQ_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Upfront fees" helper="Stamp duty, legal and lender fees">
        <AmountInput
          aria-label="Upfront fees"
          value={m.upfrontFees}
          placeholder="0"
          onValueChange={(upfrontFees) => onChange({ upfrontFees })}
        />
      </Field>

      <Field label="Stamp duty estimate">
        <select
          aria-label="Stamp duty state"
          value={m.dutyState}
          onChange={(e) => onChange({ dutyState: e.target.value as AuState })}
        >
          {AU_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      {(() => {
        const duty = stampDutyFor(m.dutyState, m.propertyValue);
        const info = STAMP_DUTY[m.dutyState];
        if (duty === null || !info) {
          return <span className="caption">No verified duty table for {m.dutyState} yet.</span>;
        }
        return (
          <span className="caption">
            {m.dutyState} duty on {money(m.propertyValue)}:{' '}
            <b data-testid="duty-estimate">{money(duty)}</b>{' '}
            <button
              type="button"
              className="inputs__reset"
              style={{ display: 'inline' }}
              onClick={() => onChange({ upfrontFees: Math.round(duty) })}
            >
              use as upfront fees
            </button>
            <br />
            {info.fhbNote}{' '}
            <a href={info.source.url} rel="noopener" target="_blank">
              source
            </a>{' '}
            (checked {info.source.checked})
          </span>
        );
      })()}

      <div className="inputs__divider" />
      <span className="overline">{m.split ? 'Portion one' : 'Interest'}</span>

      <div className="inputs__aux">
        <Field label="Rate (%)">
          <input
            type="number"
            min="0"
            max="20"
            step="0.01"
            aria-label="Interest rate"
            value={m.portions[0].ratePercent}
            onChange={(e) => setPortion(0, { ratePercent: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Option">
          <select
            aria-label="Interest option"
            value={m.portions[0].option}
            onChange={(e) => setPortion(0, { option: e.target.value as InterestOption })}
          >
            {Object.entries(OPTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {m.portions[0].option !== 'interestOnly' && (
        <Field label="Interest-only years first" helper="0 for principal and interest from day one">
          <input
            type="number"
            min="0"
            max="15"
            value={m.portions[0].interestOnlyYears}
            onChange={(e) =>
              setPortion(0, { interestOnlyYears: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </Field>
      )}
      {m.split && (
        <Field label="Portion one amount">
          <AmountInput
            value={m.portions[0].amount}
            onValueChange={(amount) => setPortion(0, { amount })}
          />
        </Field>
      )}

      <Switch
        label="Split loan"
        hint="Two portions with their own rate and option"
        checked={m.split}
        onChange={(v) => {
          if (v && m.portions[1].amount === 0) {
            const half = Math.round(m.portions[0].amount / 2);
            onChange({
              split: true,
              portions: [
                { ...m.portions[0], amount: m.portions[0].amount - half },
                { ...m.portions[1], amount: half },
              ],
            });
          } else {
            onChange({ split: v });
          }
        }}
      />

      {m.split && (
        <>
          <span className="overline">Portion two</span>
          <Field label="Portion two amount">
            <AmountInput
              value={m.portions[1].amount}
              onValueChange={(amount) => setPortion(1, { amount })}
            />
          </Field>
          <div className="inputs__aux">
            <Field label="Rate (%)">
              <input
                type="number"
                min="0"
                max="20"
                step="0.01"
                value={m.portions[1].ratePercent}
                onChange={(e) => setPortion(1, { ratePercent: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Option">
              <select
                value={m.portions[1].option}
                onChange={(e) => setPortion(1, { option: e.target.value as InterestOption })}
              >
                {Object.entries(OPTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}

      <div className="inputs__divider" />

      <Field
        label={`Extra repayment per ${m.frequency === 'monthly' ? 'month' : m.frequency === 'fortnightly' ? 'fortnight' : 'week'}`}
        helper="On top of the required repayment"
      >
        <AmountInput
          aria-label="Extra repayment"
          value={m.extraPerPeriod}
          placeholder="0"
          onValueChange={(extraPerPeriod) => onChange({ extraPerPeriod })}
        />
      </Field>

      <button type="button" className="inputs__reset" onClick={onReset}>
        Reset everything
      </button>
    </form>
  );
}
