import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FY_DATA } from '../data';
import type { CalculatorInputs } from '../engine/calculate';
import { calculate, DEFAULT_INPUTS } from '../engine/calculate';
import { money } from '../engine/format';
import { BreakdownCard } from './BreakdownCard';

const fyData = FY_DATA['2026-27'];

function renderFor(
  patch: Partial<CalculatorInputs> = {},
  view: 'annually' | 'monthly' = 'annually',
) {
  const inputs = { ...DEFAULT_INPUTS, ...patch };
  const result = calculate(inputs, fyData);
  const utils = render(
    <BreakdownCard inputs={inputs} result={result} fyData={fyData} view={view} />,
  );
  return { ...utils, inputs, result };
}

describe('BreakdownCard', () => {
  it('lays out gross, tax and take-home for the default case', () => {
    const { result } = renderFor();
    expect(screen.getByTestId('gross')).toHaveTextContent(money(result.grossSalary));
    expect(screen.getByTestId('income-tax')).toHaveTextContent(money(result.netIncomeTax));
    expect(screen.getByTestId('medicare')).toHaveTextContent(money(result.medicareLevy));
    expect(screen.getByTestId('take-home-annual')).toHaveTextContent(money(result.takeHome));
    expect(screen.getByTestId('super')).toHaveTextContent(money(result.superGuarantee));
  });

  it('shows the per-period column alongside the annual one', () => {
    const { result } = renderFor({}, 'monthly');
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText(money(result.grossSalary / 12))).toBeInTheDocument();
  });

  it('hides optional rows that do not apply', () => {
    renderFor();
    expect(screen.queryByText('Salary sacrifice to super')).toBeNull();
    expect(screen.queryByText('Other deductions')).toBeNull();
    expect(screen.queryByText('Medicare levy surcharge')).toBeNull();
    expect(screen.queryByTestId('stsl')).toBeNull();
  });

  it('adds sacrifice, deduction and study loan rows when they apply', () => {
    const { result } = renderFor({
      salarySacrificeSuper: 12_000,
      deductions: 2_000,
      hasStudentLoan: true,
    });
    expect(screen.getByText('Salary sacrifice to super')).toBeInTheDocument();
    expect(screen.getByText('Other deductions')).toBeInTheDocument();
    expect(screen.getByTestId('stsl')).toHaveTextContent(money(result.studentLoanRepayment));
  });

  it('adds the surcharge row without hospital cover on a high income', () => {
    const { result } = renderFor({ salary: 200_000 });
    expect(result.medicareSurcharge).toBeGreaterThan(0);
    expect(screen.getByText('Medicare levy surcharge')).toBeInTheDocument();
    expect(screen.getByText('No private hospital cover')).toBeInTheDocument();
  });

  it('drops the Medicare row for foreign residents and working holiday makers', () => {
    renderFor({ category: 'foreign' });
    expect(screen.queryByTestId('medicare')).toBeNull();
  });

  it('notes the exemption level on the Medicare row', () => {
    renderFor({ medicareExemption: 'half' });
    expect(screen.getByText('Half exemption applied')).toBeInTheDocument();
  });

  it('explains where super comes from', () => {
    renderFor({ salaryIncludesSuper: true });
    expect(screen.getByText(/Part of your package/)).toBeInTheDocument();
  });

  it('warns when contributions exceed the concessional cap', () => {
    const { result } = renderFor({ salarySacrificeSuper: 40_000 });
    expect(result.overConcessionalCap).toBe(true);
    expect(screen.getByText(/exceed the/)).toHaveTextContent(money(result.concessionalCap));
  });

  it('warns about Division 293 on a very high income', () => {
    const { result } = renderFor({ salary: 400_000 });
    expect(result.div293Payable).toBeGreaterThan(0);
    expect(screen.getByText(/Division 293/)).toHaveTextContent(money(result.div293Payable));
  });
});
