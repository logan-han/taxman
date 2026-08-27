import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CompareInputs } from '../engine/compare';
import { DEFAULT_COMPARE, STATE_PUBLIC_HOLIDAYS } from '../engine/compare';
import { CompareInputsPanel } from './CompareInputs';

function setup(patch: Partial<CompareInputs> = {}) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  render(
    <CompareInputsPanel
      compare={{ ...DEFAULT_COMPARE, ...patch }}
      onChange={onChange}
      onReset={onReset}
    />,
  );
  return { onChange, onReset };
}

describe('CompareInputsPanel', () => {
  it('names the rate field after the chosen unit', () => {
    setup();
    expect(screen.getByText('Day rate')).toBeInTheDocument();
    setup({ contractTimeUnit: 'hourly' });
    expect(screen.getByText('Hourly rate')).toBeInTheDocument();
  });

  it('takes a contract rate', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Contract rate'), { target: { value: '1,100' } });
    expect(onChange).toHaveBeenCalledWith({ contractRate: 1100 });
  });

  it('switches the rate unit', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Rate unit'), { target: { value: 'hourly' } });
    expect(onChange).toHaveBeenCalledWith({ contractTimeUnit: 'hourly' });
  });

  it('asks for hours per day only on an hourly rate', () => {
    setup();
    expect(screen.queryByText('Hours per day')).toBeNull();
    const { onChange } = setup({ contractTimeUnit: 'hourly' });
    expect(screen.getByText('Hours per day')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('7.5'), { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith({ hoursPerDay: 8 });
  });

  it('falls back to a standard day when hours per day are cleared', () => {
    const { onChange } = setup({ contractTimeUnit: 'hourly' });
    fireEvent.change(screen.getByDisplayValue('7.5'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ hoursPerDay: 7.5 });
  });

  it('takes both sides of the super question', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /Rate includes super/ }));
    expect(onChange).toHaveBeenCalledWith({ contractIncludesSuper: true });
    fireEvent.click(screen.getByRole('checkbox', { name: /Salary includes super/ }));
    expect(onChange).toHaveBeenCalledWith({ permIncludesSuper: true });
  });

  it('takes the permanent salary and bonus', () => {
    const { onChange } = setup({ permBonus: 5_000 });
    fireEvent.change(screen.getByLabelText('Permanent salary'), { target: { value: '145000' } });
    expect(onChange).toHaveBeenCalledWith({ permSalary: 145_000 });
    fireEvent.change(screen.getByDisplayValue('5,000'), { target: { value: '10000' } });
    expect(onChange).toHaveBeenCalledWith({ permBonus: 10_000 });
  });

  it('never lets a super rate go negative', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Contract super rate (%)'), {
      target: { value: '-5' },
    });
    expect(onChange).toHaveBeenCalledWith({ contractSuperPercent: 0 });
    fireEvent.change(screen.getByLabelText('Permanent super rate (%)'), {
      target: { value: '-5' },
    });
    expect(onChange).toHaveBeenCalledWith({ permSuperPercent: 0 });
  });

  it('applies the state public holiday default when the state changes', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('State or territory'), { target: { value: 'VIC' } });
    expect(onChange).toHaveBeenCalledWith({
      state: 'VIC',
      publicHolidayDays: STATE_PUBLIC_HOLIDAYS.VIC,
    });
  });

  it('clamps the work year fields at zero', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Work days a year'), { target: { value: '-1' } });
    expect(onChange).toHaveBeenCalledWith({ workDaysPerYear: 0 });
    fireEvent.change(screen.getByLabelText('Public holidays'), { target: { value: '-1' } });
    expect(onChange).toHaveBeenCalledWith({ publicHolidayDays: 0 });
    fireEvent.change(screen.getByLabelText('Annual leave days'), { target: { value: '-1' } });
    expect(onChange).toHaveBeenCalledWith({ annualLeaveDays: 0 });
    fireEvent.change(screen.getByLabelText('Sick days'), { target: { value: '-1' } });
    expect(onChange).toHaveBeenCalledWith({ sickDays: 0 });
  });

  it('applies the study loan and hospital cover to both offers', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /Study loan/ }));
    expect(onChange).toHaveBeenCalledWith({ hasStudentLoan: true });
    fireEvent.click(screen.getByRole('checkbox', { name: /Private hospital cover/ }));
    expect(onChange).toHaveBeenCalledWith({ privateHospitalCover: true });
  });

  it('resets everything on request', () => {
    const { onReset } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(onReset).toHaveBeenCalled();
  });
});
