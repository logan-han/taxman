import type { FYData } from '../data';
import type { CalculationResult, CalculatorInputs } from '../engine/calculate';
import { money } from '../engine/format';
import { AtoLink } from './controls';
import type { ViewPeriod } from './view';
import { VIEW_COLUMN_LABEL, VIEW_DIVISOR } from './view';

interface Props {
  inputs: CalculatorInputs;
  result: CalculationResult;
  fyData: FYData;
  view: ViewPeriod;
}

export function BreakdownCard({ inputs, result: r, fyData, view }: Props) {
  const d = VIEW_DIVISOR[view];
  const src = (key: string) => fyData.sources[key];

  return (
    <section className="card" aria-label="Where it goes">
      <div className="tbl">
        <div className="tbl__head">
          <span className="overline">Where it goes</span>
          <span>{VIEW_COLUMN_LABEL[view]}</span>
          <span>Annual</span>
        </div>

        <div className="tbl__row tbl__row--muted">
          <span>Gross salary</span>
          <span>{money(r.grossSalary / d)}</span>
          <span data-testid="gross">{money(r.grossSalary)}</span>
        </div>

        {r.salarySacrificeSuper > 0 && (
          <div className="tbl__row">
            <span>
              Salary sacrifice to super
              <AtoLink href={src('concessionalCap')?.url} checked={src('concessionalCap')?.checked} />
              <small>Yours, inside super</small>
            </span>
            <span>−{money(r.salarySacrificeSuper / d)}</span>
            <span>−{money(r.salarySacrificeSuper)}</span>
          </div>
        )}

        {inputs.deductions > 0 && (
          <div className="tbl__row tbl__row--muted">
            <span>Other deductions</span>
            <span>−{money(inputs.deductions / d)}</span>
            <span>−{money(inputs.deductions)}</span>
          </div>
        )}

        <div className="tbl__row tbl__row--minus">
          <span>
            Income tax
            <AtoLink href={src('brackets')?.url} checked={src('brackets')?.checked} />
            {r.lito > 0 && r.incomeTax > 0 && (
              <small>After {money(Math.min(r.lito, r.incomeTax))} low income tax offset</small>
            )}
          </span>
          <span>−{money(r.netIncomeTax / d)}</span>
          <span data-testid="income-tax">−{money(r.netIncomeTax)}</span>
        </div>

        {inputs.category !== 'foreign' && inputs.category !== 'whm' && (
          <div className="tbl__row tbl__row--minus">
            <span>
              Medicare levy
              <AtoLink href={src('medicare')?.url} checked={src('medicare')?.checked} />
              {inputs.medicareExemption !== 'none' && (
                <small>
                  {inputs.medicareExemption === 'full' ? 'Full' : 'Half'} exemption applied
                </small>
              )}
            </span>
            <span>−{money(r.medicareLevy / d)}</span>
            <span data-testid="medicare">−{money(r.medicareLevy)}</span>
          </div>
        )}

        {r.medicareSurcharge > 0 && (
          <div className="tbl__row tbl__row--minus">
            <span>
              Medicare levy surcharge
              <AtoLink href={src('mls')?.url} checked={src('mls')?.checked} />
              <small>No private hospital cover</small>
            </span>
            <span>−{money(r.medicareSurcharge / d)}</span>
            <span>−{money(r.medicareSurcharge)}</span>
          </div>
        )}

        {inputs.hasStudentLoan && (
          <div className="tbl__row tbl__row--minus">
            <span>
              Study loan repayment
              <AtoLink href={src('stsl')?.url} checked={src('stsl')?.checked} />
            </span>
            <span>−{money(r.studentLoanRepayment / d)}</span>
            <span data-testid="stsl">−{money(r.studentLoanRepayment)}</span>
          </div>
        )}

        <div className="tbl__row tbl__row--total">
          <span>Take-home pay</span>
          <span>{money(r.takeHome / d)}</span>
          <span data-testid="take-home-annual">{money(r.takeHome)}</span>
        </div>

        <div className="tbl__row tbl__row--muted">
          <span>
            Superannuation (
            {(fyData.superRules.guaranteeRate * 100).toFixed(1).replace('.0', '')}%)
            <AtoLink href={src('super')?.url} checked={src('super')?.checked} />
            <small>
              {inputs.salaryIncludesSuper
                ? 'Part of your package, paid into your fund'
                : 'Paid by your employer on top of your salary'}
              {r.superIsCapped ? '. Capped at the maximum contribution base' : ''}
            </small>
          </span>
          <span>+{money(r.superGuarantee / d)}</span>
          <span data-testid="super">+{money(r.superGuarantee)}</span>
        </div>
      </div>

      {(r.overConcessionalCap || r.div293Payable > 0) && (
        <div className="notes">
          {r.overConcessionalCap && (
            <p className="note--warn">
              Super contributions of {money(r.concessionalTotal)} exceed the{' '}
              {money(r.concessionalCap)} concessional cap. The excess is taxed at your marginal
              rate.
            </p>
          )}
          {r.div293Payable > 0 && (
            <p className="note--warn">
              Division 293: income plus super of {money(r.div293Income)} is over{' '}
              {money(fyData.div293.threshold)}, adding {money(r.div293Payable)} extra tax on
              super contributions (not included above).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
