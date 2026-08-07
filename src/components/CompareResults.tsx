import type { FYData } from '../data';
import type { CompareInputs, CompareResult, SideResult } from '../engine/compare';
import { money } from '../engine/format';
import { AtoLink } from './controls';

interface Props {
  compare: CompareInputs;
  result: CompareResult;
  fyData: FYData;
}

function SideBar({ side, max }: { side: SideResult; max: number }) {
  const widths = [
    { color: 'var(--pay-primary-main)', value: side.takeHome },
    {
      color: 'var(--pay-secondary-main)',
      value: side.result.netIncomeTax + side.result.medicareLevy + side.result.medicareSurcharge,
    },
    { color: 'var(--pay-warning-main)', value: side.result.studentLoanRepayment },
  ].filter((s) => s.value > 0);
  return (
    <div className="hero__bar compare__bar">
      {widths.map((w, i) => (
        <span key={i} style={{ width: `${(w.value / max) * 100}%`, background: w.color }} />
      ))}
    </div>
  );
}

export function CompareResults({ compare: c, result: r, fyData }: Props) {
  const better = r.deltaTakeHome >= 0 ? 'Contracting' : 'The permanent job';
  const delta = Math.abs(r.deltaTakeHome);
  const pct = Math.abs(r.deltaPercent * 100).toFixed(1);
  const maxGross = Math.max(r.contract.taxableIncome, r.permanent.taxableIncome, 1);

  const rows: {
    label: string;
    perm: number;
    contract: number;
    signed?: boolean;
    muted?: boolean;
    sourceKey?: string;
  }[] = [
    { label: 'Package including super', perm: r.permanent.packageTotal, contract: r.contract.packageTotal, muted: true },
    { label: 'Taxable income', perm: r.permanent.taxableIncome, contract: r.contract.taxableIncome, muted: true },
    { label: 'Income tax', perm: -r.permanent.result.netIncomeTax, contract: -r.contract.result.netIncomeTax, signed: true, sourceKey: 'brackets' },
    { label: 'Medicare levy', perm: -r.permanent.result.medicareLevy, contract: -r.contract.result.medicareLevy, signed: true, sourceKey: 'medicare' },
    ...(r.permanent.result.medicareSurcharge > 0 || r.contract.result.medicareSurcharge > 0
      ? [
          {
            label: 'Medicare levy surcharge',
            perm: -r.permanent.result.medicareSurcharge,
            contract: -r.contract.result.medicareSurcharge,
            signed: true,
            sourceKey: 'mls',
          },
        ]
      : []),
    ...(c.hasStudentLoan
      ? [
          {
            label: 'Study loan repayment',
            perm: -r.permanent.result.studentLoanRepayment,
            contract: -r.contract.result.studentLoanRepayment,
            signed: true,
            sourceKey: 'stsl',
          },
        ]
      : []),
  ];

  return (
    <>
      <section className="hero card" aria-label="Comparison verdict">
        <div className="hero__amount-block">
          <span className="overline">Which offer wins</span>
          <div className="hero__amount-row">
            <span className="hero__amount hero__amount--compare" data-testid="verdict">
              {better} pays {money(delta)} more
            </span>
          </div>
          <span className="hero__caption">
            a year in take-home pay ({pct}% of the permanent net). Counting super, the gap is{' '}
            {money(Math.abs(r.deltaWithSuper))}{' '}
            {r.deltaWithSuper >= 0 ? 'in favour of contracting' : 'in favour of permanent'}. Based
            on {r.contractPaidDays} contract paid days ({c.workDaysPerYear} work days −{' '}
            {c.publicHolidayDays} public holidays − {c.annualLeaveDays} leave − {c.sickDays}{' '}
            sick).
          </span>
        </div>

        <div className="compare__sides">
          <div className="compare__side">
            <div className="compare__side-head">
              <span className="caption">Contract · {money(r.contractRatePerDay)}/day</span>
              <b data-testid="contract-net">{money(r.contract.takeHome)}</b>
            </div>
            <SideBar side={r.contract} max={maxGross} />
          </div>
          <div className="compare__side">
            <div className="compare__side-head">
              <span className="caption">Permanent · {money(c.permSalary + c.permBonus)}</span>
              <b data-testid="perm-net">{money(r.permanent.takeHome)}</b>
            </div>
            <SideBar side={r.permanent} max={maxGross} />
          </div>
        </div>
      </section>

      <section className="card" aria-label="Comparison breakdown">
        <div className="tbl">
          <div className="tbl__head">
            <span className="overline">Side by side</span>
            <span>Permanent</span>
            <span>Contract</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className={`tbl__row${row.signed ? ' tbl__row--minus' : ''}${row.muted ? ' tbl__row--muted' : ''}`}
            >
              <span>
                {row.label}
                {row.sourceKey && fyData.sources[row.sourceKey] ? (
                  <AtoLink
                    href={fyData.sources[row.sourceKey].url}
                    checked={fyData.sources[row.sourceKey].checked}
                  />
                ) : null}
              </span>
              <span>{row.signed ? `−${money(-row.perm)}` : money(row.perm)}</span>
              <span>{row.signed ? `−${money(-row.contract)}` : money(row.contract)}</span>
            </div>
          ))}
          <div className="tbl__row tbl__row--total">
            <span>Take-home pay</span>
            <span>{money(r.permanent.takeHome)}</span>
            <span>{money(r.contract.takeHome)}</span>
          </div>
          <div className="tbl__row tbl__row--muted">
            <span>Super</span>
            <span>+{money(r.permanent.superAmount)}</span>
            <span>+{money(r.contract.superAmount)}</span>
          </div>
        </div>
      </section>

      <p className="caption disclaimer">
        Both offers are taxed as a full-year Australian resident with the tax-free threshold, in{' '}
        {fyData.fy}, including the low income tax offset, the Medicare levy low-income reduction
        and the levy surcharge where they apply. A contractor is only paid for days worked;
        leave, sick days and public holidays are unpaid. Contract super is{' '}
        {c.contractIncludesSuper ? 'carved out of the quoted rate' : 'assumed on top of the rate'}
        . GST, business expenses, insurances, payroll tax and personal services income rules are
        not modelled. Not financial advice.
      </p>
    </>
  );
}
