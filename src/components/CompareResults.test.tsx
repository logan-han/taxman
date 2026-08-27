import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FY_DATA } from '../data';
import type { CompareInputs } from '../engine/compare';
import { compareContractPermanent, DEFAULT_COMPARE } from '../engine/compare';
import { money } from '../engine/format';
import { CompareResults } from './CompareResults';

const fyData = FY_DATA['2026-27'];

function renderFor(patch: Partial<CompareInputs> = {}) {
  const compare = { ...DEFAULT_COMPARE, ...patch };
  const result = compareContractPermanent(compare, fyData);
  return {
    ...render(<CompareResults compare={compare} result={result} fyData={fyData} />),
    result,
  };
}

describe('CompareResults', () => {
  it('declares the permanent job the winner when it pays more', () => {
    const { result } = renderFor({ contractRate: 500, permSalary: 200_000 });
    expect(result.deltaTakeHome).toBeLessThan(0);
    expect(screen.getByTestId('verdict')).toHaveTextContent(
      `The permanent job pays ${money(Math.abs(result.deltaTakeHome))} more`,
    );
  });

  it('declares contracting the winner when the rate wins', () => {
    const { result } = renderFor({ contractRate: 1_500, permSalary: 130_000 });
    expect(result.deltaTakeHome).toBeGreaterThan(0);
    expect(screen.getByTestId('verdict')).toHaveTextContent(
      `Contracting pays ${money(result.deltaTakeHome)} more`,
    );
  });

  it('shows each side net and the paid-days arithmetic behind it', () => {
    const { result } = renderFor();
    expect(screen.getByTestId('contract-net')).toHaveTextContent(money(result.contract.takeHome));
    expect(screen.getByTestId('perm-net')).toHaveTextContent(money(result.permanent.takeHome));
    expect(screen.getByText(/contract paid days/)).toHaveTextContent(
      `${result.contractPaidDays} contract paid days`,
    );
  });

  it('lists the always-present breakdown rows', () => {
    renderFor();
    expect(screen.getByText('Package including super')).toBeInTheDocument();
    expect(screen.getByText('Taxable income')).toBeInTheDocument();
    expect(screen.getByText('Income tax')).toBeInTheDocument();
    expect(screen.getByText('Medicare levy')).toBeInTheDocument();
    expect(screen.getByText('Super')).toBeInTheDocument();
  });

  it('omits the surcharge and study loan rows when neither applies', () => {
    renderFor({ contractRate: 400, permSalary: 80_000 });
    expect(screen.queryByText('Medicare levy surcharge')).toBeNull();
    expect(screen.queryByText('Study loan repayment')).toBeNull();
  });

  it('adds the surcharge row when either side crosses the threshold', () => {
    renderFor({ permSalary: 200_000 });
    expect(screen.getByText('Medicare levy surcharge')).toBeInTheDocument();
  });

  it('adds the study loan row when the loan applies', () => {
    renderFor({ hasStudentLoan: true });
    expect(screen.getByText('Study loan repayment')).toBeInTheDocument();
  });

  it('states how contract super was treated', () => {
    renderFor();
    expect(screen.getByText(/assumed on top of the rate/)).toBeInTheDocument();
    renderFor({ contractIncludesSuper: true });
    expect(screen.getByText(/carved out of the quoted rate/)).toBeInTheDocument();
  });

  it('charts both sides', () => {
    const { container } = renderFor({ hasStudentLoan: true });
    expect(container.querySelectorAll('.compare__bar')).toHaveLength(2);
  });
});
