import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FY_DATA } from '../data';
import type { CalculatorInputs } from '../engine/calculate';
import { calculate, DEFAULT_INPUTS } from '../engine/calculate';
import { money } from '../engine/format';
import { scaleFor, withholdingFor } from '../engine/withholding';
import { PayslipCard } from './PayslipCard';

const fyData = FY_DATA['2026-27'];

function renderFor(patch: Partial<CalculatorInputs> = {}, fy = fyData) {
  const inputs = { ...DEFAULT_INPUTS, ...patch };
  const result = calculate(inputs, fy);
  return { ...render(<PayslipCard inputs={inputs} result={result} fyData={fy} />), inputs, result };
}

describe('PayslipCard', () => {
  it('withholds per pay using the Schedule 1 formulas, not annual tax over pays', () => {
    const { result } = renderFor();
    const scale = scaleFor('resident', 'none', fyData)!;
    const weekly = withholdingFor(
      result.grossSalary - result.salarySacrificeSuper,
      'weekly',
      scale,
    );
    expect(screen.getByTestId('withheld-weekly')).toHaveTextContent(money(weekly.withheldPerPay));
    expect(screen.getByTestId('withheld-fortnightly')).toBeInTheDocument();
    expect(screen.getByTestId('withheld-monthly')).toBeInTheDocument();
  });

  it('tells the user which way tax time will land', () => {
    renderFor();
    // default inputs over-withhold slightly, so all three cycles expect a refund
    expect(screen.getAllByText(/refund at tax time/)).toHaveLength(3);
  });

  it('excludes salary sacrifice from the withholding base', () => {
    const { result } = renderFor({ salarySacrificeSuper: 15_000 });
    const scale = scaleFor('resident', 'none', fyData)!;
    const weekly = withholdingFor(result.grossSalary - 15_000, 'weekly', scale);
    expect(screen.getByTestId('withheld-weekly')).toHaveTextContent(money(weekly.withheldPerPay));
  });

  it('uses the exemption scales when a Medicare exemption applies', () => {
    const { result } = renderFor({ medicareExemption: 'full' });
    const full = withholdingFor(
      result.grossSalary,
      'weekly',
      scaleFor('resident', 'full', fyData)!,
    );
    const none = withholdingFor(
      result.grossSalary,
      'weekly',
      scaleFor('resident', 'none', fyData)!,
    );
    expect(full.withheldPerPay).toBeLessThan(none.withheldPerPay);
    expect(screen.getByTestId('withheld-weekly')).toHaveTextContent(money(full.withheldPerPay));
  });

  it('notes that the study loan component is withheld separately', () => {
    renderFor({ hasStudentLoan: true });
    expect(screen.getByText(/Schedule 8, not shown/)).toBeInTheDocument();
  });

  it('notes that the surcharge is billed rather than withheld', () => {
    renderFor({ salary: 200_000 });
    expect(screen.getByText(/not withheld from pay/)).toBeInTheDocument();
  });

  it('explains itself for working holiday makers instead of guessing', () => {
    renderFor({ category: 'whm' });
    expect(screen.getByText(/Schedule 15/)).toBeInTheDocument();
    expect(screen.queryByTestId('withheld-weekly')).toBeNull();
  });

  it('asks for the current year when a year has no published coefficients', () => {
    renderFor({}, FY_DATA['2024-25']);
    expect(screen.getByText(/only published for the current year/)).toBeInTheDocument();
    expect(screen.queryByTestId('withheld-weekly')).toBeNull();
  });
});
