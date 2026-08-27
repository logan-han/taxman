import type { FYData } from '../data';
import type { CalculationResult, CalculatorInputs } from '../engine/calculate';
import { money, moneyCents } from '../engine/format';
import { scaleFor, withholdingFor } from '../engine/withholding';
import type { WithholdingFrequency } from '../engine/withholding';
import { AtoLink } from './controls';

const FREQUENCIES: { key: WithholdingFrequency; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'fortnightly', label: 'Fortnightly' },
  { key: 'monthly', label: 'Monthly' },
];

interface Props {
  inputs: CalculatorInputs;
  result: CalculationResult;
  fyData: FYData;
}

/**
 * What the payslip will show: ATO Schedule 1 PAYG withholding per pay,
 * which deliberately differs from annual liability / pays.
 */
export function PayslipCard({ inputs, result: r, fyData }: Props) {
  const scale = scaleFor(inputs.category, inputs.medicareExemption, fyData);

  if (!scale) {
    return (
      <section className="card" aria-label="On your payslip">
        <span className="overline">On your payslip</span>
        <p className="caption" style={{ marginTop: 8 }}>
          {inputs.category === 'whm'
            ? 'Working holiday makers are taxed under a separate withholding table (Schedule 15), not modelled here. The annual figures above still apply.'
            : 'Per-pay withholding coefficients are only published for the current year. Select 2026-27 to see payslip amounts.'}
        </p>
      </section>
    );
  }

  const annualEarnings = r.grossSalary - r.salarySacrificeSuper;
  const annualLiability = r.netIncomeTax + r.medicareLevy;

  return (
    <section className="card" aria-label="On your payslip">
      <div className="section-head">
        <span className="overline">
          On your payslip
          <AtoLink
            href={fyData.sources.withholding?.url}
            checked={fyData.sources.withholding?.checked}
          />
        </span>
      </div>
      <p className="caption" style={{ margin: '0 0 12px' }}>
        Employers withhold using the ATO's per-pay formulas, not your annual tax ÷ pays. Offsets
        settle at tax time, so a small refund is normal.
      </p>

      <div className="tbl">
        <div className="tbl__head">
          <span>If paid</span>
          <span>Tax withheld</span>
          <span>In the bank</span>
        </div>
        {FREQUENCIES.map(({ key, label }) => {
          const w = withholdingFor(annualEarnings, key, scale);
          const diff = w.annualisedWithholding - annualLiability;
          return (
            <div className="tbl__row" key={key}>
              <span>
                {label}
                <small>
                  {diff >= 0
                    ? `About ${money(diff)} refund at tax time`
                    : `About ${money(-diff)} owing at tax time`}
                </small>
              </span>
              <span style={{ color: 'var(--pay-error-main)' }} data-testid={`withheld-${key}`}>
                −{money(w.withheldPerPay)}
              </span>
              <span style={{ color: 'var(--pay-secondary-main)', fontWeight: 700 }}>
                {moneyCents(w.netPerPay)}
              </span>
            </div>
          );
        })}
      </div>

      {inputs.hasStudentLoan && (
        <p className="caption" style={{ marginTop: 12 }}>
          Your employer also withholds a study loan component each pay (Schedule 8, not shown here).
          The annual repayment of {money(r.studentLoanRepayment)} is what actually comes off your
          loan when you lodge.
        </p>
      )}
      {r.medicareSurcharge > 0 && (
        <p className="caption" style={{ marginTop: 4 }}>
          The Medicare levy surcharge is not withheld from pay - it lands as a bill at tax time.
        </p>
      )}
    </section>
  );
}
