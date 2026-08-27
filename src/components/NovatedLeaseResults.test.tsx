import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FY_DATA } from '../data';
import type { NovatedLeaseInputs } from '../engine/novatedLease';
import { calculateNovatedLease, defaultNovated } from '../engine/novatedLease';
import { money } from '../engine/format';
import { NovatedLeaseResults } from './NovatedLeaseResults';

const fyData = FY_DATA['2026-27'];

function renderFor(patch: Partial<NovatedLeaseInputs> = {}) {
  const n = { ...defaultNovated(new Date(2026, 7, 1)), ...patch };
  const result = calculateNovatedLease(n, fyData);
  const utils = render(<NovatedLeaseResults n={n} result={result} fyData={fyData} />);
  return { ...utils, n, result };
}

describe('NovatedLeaseResults', () => {
  it('leads with the interest rate the quote never states', () => {
    const { result } = renderFor();
    expect(result.impliedAprPercent).not.toBeNull();
    expect(screen.getByTestId('novated-apr')).toHaveTextContent(
      `${result.impliedAprPercent!.toFixed(2)}%`,
    );
    expect(screen.getByTestId('novated-interest')).toHaveTextContent(money(result.interestAndFees));
    expect(screen.getByTestId('lease-total')).toHaveTextContent(money(result.leaseToOwnTotal));
  });

  it('grades the implied rate', () => {
    const { result } = renderFor();
    expect(result.impliedGrade).not.toBeNull();
    expect(
      screen.getByText(/competitive|typical for novated leases|elevated|high/),
    ).toBeInTheDocument();
  });

  it('says the amount financed is an estimate when the quote hides it', () => {
    const { result } = renderFor();
    expect(result.financedIsEstimate).toBe(true);
    expect(screen.getByText(/estimated: price less the/)).toBeInTheDocument();
    expect(screen.getByText('Amount financed (estimated)')).toBeInTheDocument();
  });

  it('uses the disclosed amount financed when it is given', () => {
    const { result } = renderFor({ amountFinanced: 68_000 });
    expect(result.financedIsEstimate).toBe(false);
    expect(screen.queryByText(/estimated: price less the/)).toBeNull();
    expect(screen.getByText('Amount financed')).toBeInTheDocument();
  });

  it('shows all four ways to pay and picks a winner', () => {
    const { container, result } = renderFor();
    expect(container.querySelectorAll('.scen__row')).toHaveLength(4);
    expect(container.querySelectorAll('.scen__row--best')).toHaveLength(1);
    expect(screen.getByTestId('novated-verdict')).toHaveTextContent(
      result.leaseVsBest <= 0 ? 'comes out' : 'beats this lease by',
    );
  });

  it('spells out the residual payout including GST', () => {
    const { result } = renderFor();
    expect(screen.getByText('To own it at the end').nextElementSibling).toHaveTextContent(
      money(result.residualPayout),
    );
    expect(result.residualGst).toBeGreaterThan(0);
  });

  it('flags a residual quoted above the ATO floor', () => {
    renderFor({ residual: 30_000 });
    expect(screen.getByText(/sits .* above the floor/)).toBeInTheDocument();
  });

  it('says nothing about the floor gap when the residual sits on it', () => {
    renderFor({ residual: 19_310 });
    expect(screen.queryByText(/above the floor/)).toBeNull();
  });

  it('reports RFBA rather than post-tax contributions on an exempt EV', () => {
    const { result } = renderFor();
    expect(result.treatment.kind).toBe('exempt');
    expect(screen.getByText('Reportable fringe benefits (RFBA)')).toBeInTheDocument();
    expect(screen.queryByText('Post-tax contributions (ECM)')).toBeNull();
    expect(screen.getByText(/the whole package is paid pre-tax/)).toBeInTheDocument();
  });

  it('reports post-tax contributions on a petrol car', () => {
    const { result } = renderFor({ vehicleType: 'ice' });
    expect(result.treatment.kind).toBe('taxable');
    expect(screen.getByText('Post-tax contributions (ECM)')).toBeInTheDocument();
    expect(screen.queryByText('Reportable fringe benefits (RFBA)')).toBeNull();
  });

  it('warns that an over-cap EV keeps the exemption only until April 2027', () => {
    renderFor({ carPrice: 85_000 });
    expect(screen.getByText(/Over the announced/)).toHaveTextContent(
      'leases commence before 1 April 2027',
    );
  });

  it('explains the wind-back for a later over-cap commencement', () => {
    const { result } = renderFor({ carPrice: 85_000, startYear: 2028, startMonth: 1 });
    expect(result.treatment.kind).toBe('discounted');
    expect(screen.getByText(/only gets a 25% FBT discount/)).toBeInTheDocument();
    expect(screen.getByText(/not yet legislated/)).toBeInTheDocument();
  });

  it('passes on the luxury vehicle adjustment above the car limit', () => {
    const { result } = renderFor({ carPrice: 90_000 });
    expect(result.lvaPerYear).toBeGreaterThan(0);
    expect(screen.getByText('Luxury vehicle adjustment')).toBeInTheDocument();
    expect(screen.getByText(/even though the car is FBT-exempt/)).toBeInTheDocument();
  });

  it('omits the luxury adjustment when the employer absorbs it', () => {
    const { result } = renderFor({ carPrice: 90_000, lvaPassedOn: false });
    expect(result.lvaPerYear).toBe(0);
    expect(screen.queryByText('Luxury vehicle adjustment')).toBeNull();
  });

  it('shows the extra study loan repayments RFBA causes', () => {
    const { result } = renderFor({ hasStudentLoan: true });
    expect(result.stslDeltaPerYear).toBeGreaterThan(0.5);
    expect(screen.getByTestId('novated-stsl-delta')).toHaveTextContent(
      money(result.stslDeltaPerYear),
    );
  });

  it('shows the extra surcharge and Division 293 tax RFBA causes', () => {
    // just under the $250k Division 293 threshold, so the RFBA is what tips it over
    const { result } = renderFor({ salary: 245_000 });
    expect(result.mlsDeltaPerYear).toBeGreaterThan(0.5);
    expect(result.div293DeltaPerYear).toBeGreaterThan(0.5);
    expect(screen.getByText('Extra Medicare levy surcharge')).toBeInTheDocument();
    expect(screen.getByText('Extra Division 293 tax')).toBeInTheDocument();
  });

  it('omits the surcharge row when hospital cover removes it', () => {
    renderFor({ salary: 245_000, privateHospitalCover: true });
    expect(screen.queryByText('Extra Medicare levy surcharge')).toBeNull();
  });

  it('compares take-home before and after the lease', () => {
    const { result } = renderFor();
    expect(screen.getByText('Take-home now').nextElementSibling).toHaveTextContent(
      `${money(result.baseline.takeHome / 26)} a fortnight`,
    );
    expect(screen.getByTestId('novated-outofpocket')).toBeInTheDocument();
  });

  it('uses the singular for a one year term', () => {
    renderFor({ termYears: 1 });
    expect(screen.getByText(/Same car, same 1 year,/)).toBeInTheDocument();
  });
});
