import type { FYData } from '../data';
import { CAR_THRESHOLDS_SOURCES, EV_PHASE_OUT, MIN_RESIDUAL_SOURCE } from '../data/fbt';
import type { NovatedLeaseInputs, NovatedLeaseResult, RateGrade } from '../engine/novatedLease';
import { money, moneyCents } from '../engine/format';
import { AtoLink } from './controls';

const GRADE_LABEL: Record<RateGrade, string> = {
  competitive: 'competitive',
  typical: 'typical for novated leases',
  elevated: 'elevated',
  high: 'high',
};

interface Props {
  n: NovatedLeaseInputs;
  result: NovatedLeaseResult;
  fyData: FYData;
}

export function NovatedLeaseResults({ n, result: r, fyData }: Props) {
  const apr = r.impliedAprPercent;
  const exempt = r.treatment.kind === 'exempt';
  const overCap = n.carPrice > EV_PHASE_OUT.phase2FullExemptionCap;
  const residualGap =
    r.minResidualAmount !== null ? n.residual - Math.round(r.minResidualAmount) : null;

  return (
    <>
      <section className="hero card" aria-label="Implied interest rate">
        <div className="hero__top">
          <div className="hero__amount-block">
            <span className="overline">The interest rate the quote doesn't show</span>
            <div className="hero__amount-row">
              <span className="hero__amount" data-testid="novated-apr">
                {apr === null ? 'n/a' : `${apr.toFixed(2)}%`}
              </span>
              <span className="hero__period">p.a. implied</span>
              {r.impliedGrade && (
                <span className={`chip grade--${r.impliedGrade}`}>
                  {GRADE_LABEL[r.impliedGrade]}
                </span>
              )}
            </div>
            <span className="hero__caption">
              Solved from the payment, term and residual on {money(r.amountFinanced)} financed
              {r.financedIsEstimate
                ? ` (estimated: price less the ${money(r.gstCreditOnCar)} GST credit; enter the real figure under fine print if your quote shows it)`
                : ''}
              . Your car loan alternative is {n.carLoanRatePercent.toFixed(1)}%.
            </span>
          </div>
          <div className="stat-row">
            <div className="stat">
              <span className="caption">Finance payments</span>
              <b>{money(r.totalFinancePayments)}</b>
            </div>
            <div className="stat">
              <span className="caption">Interest and fees</span>
              <b data-testid="novated-interest">{money(r.interestAndFees)}</b>
            </div>
            <div className="stat">
              <span className="caption">Lease-to-own total</span>
              <b data-testid="lease-total">{money(r.leaseToOwnTotal)}</b>
            </div>
          </div>
        </div>
        <p className="caption" style={{ margin: '10px 0 0' }}>
          Lease-to-own = {money(r.totalFinancePayments)} in payments + {money(r.residualExGst)}{' '}
          residual + {money(r.residualGst)} GST on the residual, for a {money(n.carPrice)} car.
        </p>
      </section>

      <section className="card" aria-label="Compared with your alternatives">
        <span className="overline">
          Same car, same {n.termYears} year{n.termYears > 1 ? 's' : ''}, four ways to pay
        </span>
        <p className="caption" style={{ margin: '4px 0 10px' }}>
          Every scenario ends with you owning the car outright and paying real running costs (GST
          added back outside the lease). True cost values each payment in end-of-term dollars at
          your {n.mortgageRatePercent.toFixed(1)}% mortgage/offset rate, so paying early costs the
          offset interest you would have earned.
        </p>
        <div className="scen">
          <div className="scen__head">
            <span>Scenario</span>
            <span>A fortnight</span>
            <span>Total paid</span>
            <span>True cost</span>
          </div>
          {r.scenarios.map((s) => (
            <div
              key={s.key}
              className={`scen__row${s.key === (r.leaseVsBest <= 0 ? 'novated' : r.bestAlternative.key) ? ' scen__row--best' : ''}`}
            >
              <span>
                {s.label}
                {s.key === 'novated' && (
                  <small>+ {money(s.final)} residual inc GST at the end</small>
                )}
                {s.key === 'cash' && <small>{money(s.upfront)} upfront, then running costs</small>}
                {s.key === 'loan' && <small>at {n.carLoanRatePercent.toFixed(1)}%, no balloon</small>}
                {s.key === 'redraw' && (
                  <small>at {n.mortgageRatePercent.toFixed(1)}%, repaid over the term</small>
                )}
              </span>
              <span>{moneyCents(s.perFortnight)}</span>
              <span>{money(s.nominalTotal)}</span>
              <span>
                {money(s.endOfTermCost)}
                {s.key !== 'novated' && (
                  <small>
                    {s.vsLease <= 0 ? `saves ${money(-s.vsLease)}` : `${money(s.vsLease)} more`}
                  </small>
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="verdict" data-testid="novated-verdict">
          {r.leaseVsBest <= 0
            ? `The novated lease comes out ${money(-r.leaseVsBest)} ahead of the best alternative (${r.bestAlternative.label.toLowerCase()}).`
            : `${r.bestAlternative.label} beats this lease by ${money(r.leaseVsBest)} over the term; the "saves" column shows each option's difference.`}
        </p>
      </section>

      <section className="card" aria-label="What the quote does not say">
        <span className="overline">What the quote doesn't say</span>
        <div className="kv">
          <div className="kv__row">
            <span>
              Amount financed{r.financedIsEstimate ? ' (estimated)' : ''}
              <small>
                GST credit on the car is capped at {money(r.thresholds.maxGstCredit)}
                {r.gstCreditIsCapped ? ' and this car hits the cap' : ''}
              </small>
            </span>
            <span>{money(r.amountFinanced)}</span>
          </div>
          <div className="kv__row">
            <span>
              To own it at the end
              <small>
                {money(r.residualExGst)} residual + {money(r.residualGst)} GST, from post-tax money
              </small>
            </span>
            <span>{money(r.residualPayout)}</span>
          </div>
          {r.minResidualAmount !== null && residualGap !== null && (
            <div className="kv__row">
              <span>
                ATO minimum residual for {n.termYears} year{n.termYears > 1 ? 's' : ''}
                <AtoLink href={MIN_RESIDUAL_SOURCE.url} checked={MIN_RESIDUAL_SOURCE.checked} />
                <small>
                  {(r.minResidualPercent! * 100).toFixed(2)}% of the amount financed
                  {residualGap > 0
                    ? `; this quote sits ${money(residualGap)} above the floor, which lowers the fortnightly but grows the balloon`
                    : ''}
                </small>
              </span>
              <span>{money(r.minResidualAmount)}</span>
            </div>
          )}
          {r.lvaPerYear > 0 && (
            <div className="kv__row">
              <span>
                Luxury vehicle adjustment
                <small>
                  Div 242 uses the {money(r.thresholds.carLimit)} car limit, not the higher{' '}
                  {money(r.thresholds.lctFuelEfficient)} EV luxury car tax threshold: above it the
                  employer's lost deductions are passed into the package
                  {exempt ? ' even though the car is FBT-exempt' : ''}
                </small>
              </span>
              <span>{money(r.lvaPerYear)}/yr</span>
            </div>
          )}
          {exempt ? (
            <div className="kv__row">
              <span>
                Reportable fringe benefits (RFBA)
                <small>
                  Exempt from FBT but still reported: raises HELP, Medicare levy surcharge, Div 293,
                  child support and family assistance incomes
                </small>
              </span>
              <span>{money(r.rfbaPerYear)}/yr</span>
            </div>
          ) : (
            <div className="kv__row">
              <span>
                Post-tax contributions (ECM)
                <small>
                  {(r.treatment.statutoryFraction * 100).toFixed(0)}% of the car's value each year
                  zeroes the FBT; includes {money(r.ecmGstPerYear)}/yr GST the employer passes back
                </small>
              </span>
              <span>{money(r.ecmPerYear)}/yr</span>
            </div>
          )}
          {r.stslDeltaPerYear > 0.5 && (
            <div className="kv__row">
              <span>
                Extra study loan repayments
                <small>RFBA lifts repayment income above what the pre-tax deduction removes</small>
              </span>
              <span data-testid="novated-stsl-delta">+{money(r.stslDeltaPerYear)}/yr</span>
            </div>
          )}
          {r.mlsDeltaPerYear > 0.5 && (
            <div className="kv__row">
              <span>
                Extra Medicare levy surcharge
                <small>RFBA pushes MLS income to tier {r.withLease.mlsTierRate === 0.01 ? 1 : r.withLease.mlsTierRate === 0.0125 ? 2 : 3}; hospital cover would remove this</small>
              </span>
              <span>+{money(r.mlsDeltaPerYear)}/yr</span>
            </div>
          )}
          {r.div293DeltaPerYear > 0.5 && (
            <div className="kv__row">
              <span>
                Extra Division 293 tax
                <small>RFBA counts towards the $250k threshold</small>
              </span>
              <span>+{money(r.div293DeltaPerYear)}/yr</span>
            </div>
          )}
        </div>
      </section>

      <section className="card" aria-label="Take-home impact">
        <span className="overline">Your pay, before and after</span>
        <div className="kv">
          <div className="kv__row">
            <span>Take-home now</span>
            <span>{money(r.baseline.takeHome / 26)} a fortnight</span>
          </div>
          <div className="kv__row">
            <span>
              Take-home with the lease
              <small>
                after {money(r.preTaxPerYear / 26)} pre-tax
                {r.ecmPerYear > 0 ? ` and ${money(r.ecmPerYear / 26)} post-tax` : ''} deductions
              </small>
            </span>
            <span>{money((r.baseline.takeHome - r.takeHomeDropPerYear - r.ecmPerYear) / 26)} a fortnight</span>
          </div>
          <div className="kv__row kv__row--strong">
            <span>
              Real cost of the car package
              <small>
                {money(r.taxSavedPerYear)}/yr tax and GST actually saved on your income; provider
                "savings" headlines compare against paying their own costs post-tax
              </small>
            </span>
            <span data-testid="novated-outofpocket">
              {moneyCents((r.takeHomeDropPerYear + r.ecmPerYear) / 26)} a fortnight
            </span>
          </div>
        </div>
      </section>

      <section className="card" aria-label="Rules applied">
        <span className="overline">Rules applied to this lease</span>
        <div className="notes">
          {exempt && (
            <p
              className="note--warn"
              style={
                overCap
                  ? undefined
                  : { background: 'var(--pay-info-12p)', color: 'var(--pay-info-dark)' }
              }
            >
              FBT-exempt EV: the whole package is paid pre-tax.{' '}
              {overCap
                ? `Over the announced ${money(EV_PHASE_OUT.phase2FullExemptionCap)} cap this car only gets the full exemption while leases commence before 1 April 2027; later commencements drop to the 25% discount. The treatment at commencement holds for the lease term.`
                : `At or under the announced ${money(EV_PHASE_OUT.phase2FullExemptionCap)} cap the full exemption keeps applying to new leases until 31 March 2029, and the treatment at commencement holds for the lease term. From April 2029 new leases only get the 25% discount.`}
            </p>
          )}
          {r.treatment.kind === 'discounted' && (
            <p className="note--warn">
              This commencement date falls under the announced wind-back: over{' '}
              {money(EV_PHASE_OUT.phase2FullExemptionCap)} the car only gets a 25% FBT discount, so{' '}
              {money(r.ecmPerYear)}/yr of post-tax contributions are needed to zero the FBT.
            </p>
          )}
          {r.phaseRulesAreAnnouncedOnly && (
            <p className="note--warn">
              Heads up: the EV phase-out (announced 5 May 2026) is not yet legislated. Treatment
              shown follows the announcement;{' '}
              <a href={EV_PHASE_OUT.source.url} rel="noopener" target="_blank">
                Treasury release
              </a>
              .
            </p>
          )}
          <p className="caption">
            If you change jobs the novation dissolves: the lease becomes your personal debt, the
            budgets stop, and early payout means remaining rentals plus the residual plus fees.
          </p>
          <p className="caption disclaimer">
            Estimates for FY {fyData.fy} using the {money(r.thresholds.carLimit)} car limit
            <AtoLink
              href={CAR_THRESHOLDS_SOURCES.carLimit.url}
              checked={CAR_THRESHOLDS_SOURCES.carLimit.checked}
            />{' '}
            and the {money(r.thresholds.lctFuelEfficient)} fuel-efficient LCT threshold
            <AtoLink
              href={CAR_THRESHOLDS_SOURCES.lct.url}
              checked={CAR_THRESHOLDS_SOURCES.lct.checked}
            />
            . Running budgets are taken as real costs; padded budgets make quotes look better than
            they are. Not financial advice.
          </p>
        </div>
      </section>
    </>
  );
}
