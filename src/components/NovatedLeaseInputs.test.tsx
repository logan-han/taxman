import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { NovatedLeaseInputs } from '../engine/novatedLease';
import { defaultNovated } from '../engine/novatedLease';
import { NovatedInputsPanel } from './NovatedLeaseInputs';

function setup(patch: Partial<NovatedLeaseInputs> = {}) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const n = { ...defaultNovated(new Date(2026, 7, 1)), ...patch };
  render(<NovatedInputsPanel n={n} fy="2026-27" onChange={onChange} onReset={onReset} />);
  return { onChange, onReset, n };
}

describe('NovatedInputsPanel', () => {
  it('switches the vehicle type', () => {
    const { onChange } = setup();
    const group = screen.getByRole('group', { name: 'Vehicle type' });
    const [ev, nonEv] = Array.from(group.querySelectorAll('button'));
    expect(ev).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(nonEv);
    expect(onChange).toHaveBeenCalledWith({ vehicleType: 'ice' });
  });

  it('takes the quoted car price', () => {
    const { onChange } = setup();
    expect(screen.getByLabelText('Car price')).toHaveValue('75,000');
    fireEvent.change(screen.getByLabelText('Car price'), { target: { value: '82,500' } });
    expect(onChange).toHaveBeenCalledWith({ carPrice: 82_500 });
  });

  it('takes the fortnightly finance and running costs', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Finance per fortnight'), {
      target: { value: '620.5' },
    });
    expect(onChange).toHaveBeenCalledWith({ financePerFortnight: 620.5 });
    fireEvent.change(screen.getByLabelText('Running costs per fortnight'), {
      target: { value: '205' },
    });
    expect(onChange).toHaveBeenCalledWith({ runningPerFortnight: 205 });
  });

  it('refuses negative fortnightly amounts', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Finance per fortnight'), { target: { value: '-50' } });
    expect(onChange).toHaveBeenCalledWith({ financePerFortnight: 0 });
  });

  it('clamps the term to the one to five years the ATO tables cover', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Term (years)'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith({ termYears: 5 });
    fireEvent.change(screen.getByLabelText('Term (years)'), { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith({ termYears: 1 });
  });

  it('shows the ATO residual floor for the term and offers it as the residual', () => {
    const { onChange } = setup();
    // 75,000 less the 6,353 GST credit cap, at the five year floor of 28.13%
    expect(screen.getByTestId('min-residual')).toHaveTextContent('$19,310');
    fireEvent.click(screen.getByRole('button', { name: 'use ATO minimum' }));
    expect(onChange).toHaveBeenCalledWith({ residual: 19_310 });
  });

  it('takes the amount financed over the estimate when the quote discloses it', () => {
    setup({ amountFinanced: 60_000, termYears: 3 });
    expect(screen.getByTestId('min-residual')).toHaveTextContent('$28,128');
    expect(screen.getByText(/ATO floor for 3 years/)).toBeInTheDocument();
  });

  it('uses the singular for a one year term', () => {
    setup({ termYears: 1 });
    expect(screen.getByText(/ATO floor for 1 year is/)).toBeInTheDocument();
  });

  it('takes the residual and whether it includes GST', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Residual value'), { target: { value: '21,000' } });
    expect(onChange).toHaveBeenCalledWith({ residual: 21_000 });
    fireEvent.click(screen.getByRole('checkbox', { name: /Residual shown inc GST/ }));
    expect(onChange).toHaveBeenCalledWith({ residualIncludesGst: true });
  });

  it('takes the commencement month and year', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Lease start month'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith({ startMonth: 4 });
    fireEvent.change(screen.getByLabelText('Lease start year'), { target: { value: '2028' } });
    expect(onChange).toHaveBeenCalledWith({ startYear: 2028 });
  });

  it('falls back to 2026 when the start year is cleared', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Lease start year'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ startYear: 2026 });
  });

  it('takes the fine print fields', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Amount financed'), { target: { value: '70000' } });
    expect(onChange).toHaveBeenCalledWith({ amountFinanced: 70_000 });
    fireEvent.change(screen.getByLabelText('FBT base value'), { target: { value: '73000' } });
    expect(onChange).toHaveBeenCalledWith({ fbtBaseValue: 73_000 });
    fireEvent.click(screen.getByRole('checkbox', { name: /Luxury adjustment passed on/ }));
    expect(onChange).toHaveBeenCalledWith({ lvaPassedOn: false });
  });

  it('takes your salary and circumstances', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Salary'), { target: { value: '145000' } });
    expect(onChange).toHaveBeenCalledWith({ salary: 145_000 });
    fireEvent.click(screen.getByRole('checkbox', { name: /Study loan/ }));
    expect(onChange).toHaveBeenCalledWith({ hasStudentLoan: true });
    fireEvent.click(screen.getByRole('checkbox', { name: /Private hospital cover/ }));
    expect(onChange).toHaveBeenCalledWith({ privateHospitalCover: true });
  });

  it('takes the alternative finance rates, refusing negatives', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Car loan rate'), { target: { value: '6.5' } });
    expect(onChange).toHaveBeenCalledWith({ carLoanRatePercent: 6.5 });
    fireEvent.change(screen.getByLabelText('Mortgage rate'), { target: { value: '-1' } });
    expect(onChange).toHaveBeenCalledWith({ mortgageRatePercent: 0 });
  });

  it('resets everything on request', () => {
    const { onReset } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(onReset).toHaveBeenCalled();
  });
});
