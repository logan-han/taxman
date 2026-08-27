import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FY_DATA } from '../data';
import { calculate, DEFAULT_INPUTS } from '../engine/calculate';
import { money } from '../engine/format';
import { HeroCard } from './HeroCard';

const fyData = FY_DATA['2026-27'];
const result = calculate(DEFAULT_INPUTS, fyData);

describe('HeroCard', () => {
  it('divides the annual take-home by the selected period', () => {
    render(<HeroCard result={result} view="monthly" onViewChange={() => {}} />);
    expect(screen.getByTestId('take-home')).toHaveTextContent(money(result.takeHome / 12));
    expect(screen.getByText('a month')).toBeInTheDocument();
  });

  it('shows the annual figure and total tax in the caption', () => {
    render(<HeroCard result={result} view="weekly" onViewChange={() => {}} />);
    expect(screen.getByTestId('take-home')).toHaveTextContent(money(result.takeHome / 52));
    expect(
      screen.getByText(
        `${money(result.takeHome)} a year, after ${money(result.totalTax)} in tax and deductions`,
      ),
    ).toBeInTheDocument();
  });

  it('reports the period the user picks', () => {
    const onViewChange = vi.fn();
    render(<HeroCard result={result} view="annually" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fortnightly' }));
    expect(onViewChange).toHaveBeenCalledWith('fortnightly');
  });

  it('only charts the deductions that apply', () => {
    const { container } = render(
      <HeroCard result={result} view="annually" onViewChange={() => {}} />,
    );
    // default inputs: take-home, income tax and Medicare, but no study loan or sacrifice
    expect(screen.getByText('Take-home')).toBeInTheDocument();
    expect(screen.getByText('Income tax')).toBeInTheDocument();
    expect(screen.getByText('Medicare')).toBeInTheDocument();
    expect(screen.queryByText('Study loan')).toBeNull();
    expect(screen.queryByText('Super sacrifice')).toBeNull();
    expect(container.querySelectorAll('.hero__bar > span')).toHaveLength(3);
  });

  it('adds study loan and sacrifice segments when they apply', () => {
    const withExtras = calculate(
      { ...DEFAULT_INPUTS, hasStudentLoan: true, salarySacrificeSuper: 10_000 },
      fyData,
    );
    const { container } = render(
      <HeroCard result={withExtras} view="annually" onViewChange={() => {}} />,
    );
    expect(screen.getByText('Study loan')).toBeInTheDocument();
    expect(screen.getByText('Super sacrifice')).toBeInTheDocument();
    expect(container.querySelectorAll('.hero__bar > span')).toHaveLength(5);
  });
});
