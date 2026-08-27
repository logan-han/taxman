import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { stampDutyFor } from '../data/stampDuty';
import type { MortgageInputs } from '../engine/mortgage';
import { defaultMortgage } from '../engine/mortgage';
import { money } from '../engine/format';
import { MortgageInputsPanel } from './MortgageInputs';

function setup(patch: Partial<MortgageInputs> = {}) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const m = { ...defaultMortgage(2026), ...patch };
  render(<MortgageInputsPanel m={m} onChange={onChange} onReset={onReset} />);
  return { onChange, onReset, m };
}

describe('MortgageInputsPanel', () => {
  it('shows the loan and LVR implied by the deposit', () => {
    setup();
    expect(screen.getByText('Loan 800,000 · LVR 80%')).toBeInTheDocument();
  });

  it('asks for a loan amount instead of a deposit on an existing mortgage', () => {
    setup({ existing: true });
    expect(screen.queryByLabelText('Deposit')).toBeNull();
    expect(screen.getByLabelText('Loan amount')).toHaveValue('800,000');
    expect(screen.getByText('Start year')).toBeInTheDocument();
    expect(screen.getByText('Start month')).toBeInTheDocument();
  });

  it('recalculates the loan when the deposit changes', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Deposit'), { target: { value: '300000' } });
    expect(onChange).toHaveBeenCalledWith({ deposit: 300_000 });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.objectContaining({ amount: 700_000 }), expect.anything()],
    });
  });

  it('recalculates the loan when the property value changes', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Property value'), { target: { value: '1200000' } });
    expect(onChange).toHaveBeenCalledWith({ propertyValue: 1_200_000 });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.objectContaining({ amount: 1_000_000 }), expect.anything()],
    });
  });

  it('leaves the loan alone when an existing mortgage changes value', () => {
    const { onChange } = setup({ existing: true });
    fireEvent.change(screen.getByLabelText('Property value'), { target: { value: '1200000' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ propertyValue: 1_200_000 });
  });

  it('splits a changed loan amount across both portions', () => {
    const { onChange } = setup({
      existing: true,
      split: true,
      portions: [
        { amount: 600_000, ratePercent: 6, option: 'variable', interestOnlyYears: 0 },
        { amount: 200_000, ratePercent: 6, option: 'fixed2y', interestOnlyYears: 0 },
      ],
    });
    fireEvent.change(screen.getByLabelText('Loan amount'), { target: { value: '900000' } });
    expect(onChange).toHaveBeenCalledWith({
      portions: [
        expect.objectContaining({ amount: 700_000 }),
        expect.objectContaining({ amount: 200_000 }),
      ],
    });
  });

  it('clamps the term to the lender maximum', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Term (years)'), { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith({ termYears: 40 });
    fireEvent.change(screen.getByLabelText('Term (years)'), { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith({ termYears: 30 });
  });

  it('clamps the start month to a real month', () => {
    const { onChange } = setup({ existing: true });
    fireEvent.change(screen.getByLabelText('Start month'), { target: { value: '13' } });
    expect(onChange).toHaveBeenCalledWith({ startMonth: 12 });
  });

  it('changes the repayment frequency', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Repayment frequency'), {
      target: { value: 'fortnightly' },
    });
    expect(onChange).toHaveBeenCalledWith({ frequency: 'fortnightly' });
  });

  it('estimates stamp duty and offers it as the upfront fee', () => {
    const { onChange, m } = setup();
    const duty = stampDutyFor('NSW', m.propertyValue)!;
    expect(screen.getByTestId('duty-estimate')).toHaveTextContent(money(duty));
    fireEvent.click(screen.getByRole('button', { name: 'use as upfront fees' }));
    expect(onChange).toHaveBeenCalledWith({ upfrontFees: Math.round(duty) });
  });

  it('follows the selected duty state', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Stamp duty state'), { target: { value: 'VIC' } });
    expect(onChange).toHaveBeenCalledWith({ dutyState: 'VIC' });
  });

  it('estimates duty against the selected state table', () => {
    setup({ dutyState: 'VIC' });
    expect(screen.getByTestId('duty-estimate')).toHaveTextContent(
      money(stampDutyFor('VIC', 1_000_000)!),
    );
  });

  it('takes the rate and interest option for the first portion', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Interest rate'), { target: { value: '5.75' } });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.objectContaining({ ratePercent: 5.75 }), expect.anything()],
    });
    fireEvent.change(screen.getByLabelText('Interest option'), { target: { value: 'fixed3y' } });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.objectContaining({ option: 'fixed3y' }), expect.anything()],
    });
  });

  it('takes an interest-only period on a principal and interest loan', () => {
    const { onChange } = setup();
    expect(screen.getByText('Interest-only years first')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Interest-only years first/), {
      target: { value: '3' },
    });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.objectContaining({ interestOnlyYears: 3 }), expect.anything()],
    });
  });

  it('hides the interest-only years field on an interest-only loan', () => {
    setup({
      portions: [
        { amount: 800_000, ratePercent: 6, option: 'interestOnly', interestOnlyYears: 0 },
        { amount: 0, ratePercent: 6, option: 'fixed2y', interestOnlyYears: 0 },
      ],
    });
    expect(screen.queryByText('Interest-only years first')).toBeNull();
  });

  it('seeds the second portion with half the loan when splitting', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /Split loan/ }));
    expect(onChange).toHaveBeenCalledWith({
      split: true,
      portions: [
        expect.objectContaining({ amount: 400_000 }),
        expect.objectContaining({ amount: 400_000 }),
      ],
    });
  });

  it('just toggles the switch when the second portion already has an amount', () => {
    const { onChange } = setup({
      split: true,
      portions: [
        { amount: 600_000, ratePercent: 6, option: 'variable', interestOnlyYears: 0 },
        { amount: 200_000, ratePercent: 6.5, option: 'fixed2y', interestOnlyYears: 0 },
      ],
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Split loan/ }));
    expect(onChange).toHaveBeenCalledWith({ split: false });
  });

  it('edits the second portion once split', () => {
    const { onChange } = setup({
      split: true,
      portions: [
        { amount: 600_000, ratePercent: 6, option: 'variable', interestOnlyYears: 0 },
        { amount: 200_000, ratePercent: 6.5, option: 'fixed2y', interestOnlyYears: 0 },
      ],
    });
    expect(screen.getByText('Portion one')).toBeInTheDocument();
    expect(screen.getByText('Portion two')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Portion two amount'), { target: { value: '250000' } });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.anything(), expect.objectContaining({ amount: 250_000 })],
    });
    fireEvent.change(screen.getByDisplayValue('6.5'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.anything(), expect.objectContaining({ ratePercent: 7 })],
    });
    fireEvent.change(screen.getByDisplayValue('2 years fixed'), { target: { value: 'fixed5y' } });
    expect(onChange).toHaveBeenCalledWith({
      portions: [expect.anything(), expect.objectContaining({ option: 'fixed5y' })],
    });
  });

  it('names the extra repayment field after the frequency', () => {
    setup();
    expect(screen.getByText('Extra repayment per month')).toBeInTheDocument();
    setup({ frequency: 'fortnightly' });
    expect(screen.getByText('Extra repayment per fortnight')).toBeInTheDocument();
    setup({ frequency: 'weekly' });
    expect(screen.getByText('Extra repayment per week')).toBeInTheDocument();
  });

  it('takes an extra repayment', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Extra repayment'), { target: { value: '500' } });
    expect(onChange).toHaveBeenCalledWith({ extraPerPeriod: 500 });
  });

  it('resets everything on request', () => {
    const { onReset } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(onReset).toHaveBeenCalled();
  });
});
