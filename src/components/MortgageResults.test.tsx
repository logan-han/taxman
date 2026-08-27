import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MortgageInputs } from '../engine/mortgage';
import { calculateMortgage, defaultMortgage, PERIODS_PER_YEAR } from '../engine/mortgage';
import { money } from '../engine/format';
import { MortgageResults } from './MortgageResults';

function setup(patch: Partial<MortgageInputs> = {}) {
  const onChange = vi.fn();
  const m = { ...defaultMortgage(2026), ...patch };
  const result = calculateMortgage(m);
  const utils = render(<MortgageResults m={m} result={result} onChange={onChange} />);
  return { ...utils, onChange, m, result };
}

describe('MortgageResults', () => {
  it('leads with the repayment, its period and the loan summary', () => {
    const { result } = setup();
    expect(screen.getByTestId('mortgage-repayment')).toHaveTextContent(
      money(result.initialRepayment),
    );
    expect(screen.getByText('a month')).toBeInTheDocument();
    expect(screen.getByText(/6.00% ·/)).toHaveTextContent('80% LVR');
    expect(screen.getByTestId('total-interest')).toHaveTextContent(money(result.totalInterest));
  });

  it('names the period for each frequency', () => {
    setup({ frequency: 'fortnightly' });
    expect(screen.getByText('a fortnight')).toBeInTheDocument();
    expect(screen.getByText(String(PERIODS_PER_YEAR.fortnightly))).toBeInTheDocument();
    setup({ frequency: 'weekly' });
    expect(screen.getByText('a week')).toBeInTheDocument();
  });

  it('nudges the user to add stamp duty when there are no upfront fees', () => {
    setup();
    expect(screen.getByText(/deposit only; add stamp duty/)).toBeInTheDocument();
  });

  it('drops the stamp duty hint once fees are entered', () => {
    setup({ upfrontFees: 40_000 });
    expect(screen.queryByText(/deposit only; add stamp duty/)).toBeNull();
  });

  it('says nothing about extra repayments when there are none', () => {
    setup();
    expect(screen.queryByText(/pays the loan off/)).toBeNull();
  });

  it('quantifies what an extra repayment buys', () => {
    const { result } = setup({ extraPerPeriod: 500 });
    expect(result.yearsSavedByExtras).toBeGreaterThan(0);
    expect(screen.getByText(/pays the loan off/)).toHaveTextContent(
      money(result.interestSavedByExtras),
    );
  });

  it('charts the repayment split and the equity projection', () => {
    setup();
    expect(
      screen.getByRole('img', { name: 'Repayment split over the life of the loan' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Projected market value and equity' }),
    ).toBeInTheDocument();
  });

  it('reports the value and equity at payoff', () => {
    const { m, result } = setup();
    const payoffYear = Math.round(m.startYear + result.payoffYears);
    expect(screen.getByText(`Value in ${payoffYear}`).nextElementSibling).toHaveTextContent(
      money(result.endPropertyValue),
    );
    expect(screen.getByText('Equity at payoff').nextElementSibling).toHaveTextContent(
      money(result.endEquity),
    );
  });

  it('sends rate forecast changes back up, keeping the other anchor', () => {
    const { onChange, m } = setup();
    fireEvent.change(screen.getByLabelText('Near term rates year'), { target: { value: '2030' } });
    expect(onChange).toHaveBeenCalledWith({
      rateForecast: { ...m.rateForecast, nearYear: 2030 },
    });
    fireEvent.change(screen.getByLabelText('Long term rates percent'), {
      target: { value: '7.5' },
    });
    expect(onChange).toHaveBeenCalledWith({
      rateForecast: { ...m.rateForecast, longPercent: 7.5 },
    });
  });

  it('sends growth forecast changes back up', () => {
    const { onChange, m } = setup();
    fireEvent.change(screen.getByLabelText('Near term growth percent'), {
      target: { value: '2.5' },
    });
    expect(onChange).toHaveBeenCalledWith({
      growthForecast: { ...m.growthForecast, nearPercent: 2.5 },
    });
    fireEvent.change(screen.getByLabelText('Long term growth year'), { target: { value: '2050' } });
    expect(onChange).toHaveBeenCalledWith({
      growthForecast: { ...m.growthForecast, longYear: 2050 },
    });
  });

  it('bounds the forecast sliders to the loan term', () => {
    const { m } = setup();
    const nearYear = screen.getByLabelText('Near term rates year');
    expect(nearYear).toHaveAttribute('min', String(m.startYear + 1));
    expect(nearYear).toHaveAttribute('max', String(m.startYear + 15));
    expect(screen.getByLabelText('Long term rates year')).toHaveAttribute(
      'max',
      String(m.startYear + m.termYears),
    );
    expect(screen.getByLabelText('Near term rates percent')).toHaveAttribute('max', '12');
    expect(screen.getByLabelText('Near term growth percent')).toHaveAttribute('max', '10');
  });
});
