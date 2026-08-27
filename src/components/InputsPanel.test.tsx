import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { CalculatorInputs } from '../engine/calculate';
import { DEFAULT_INPUTS } from '../engine/calculate';
import { InputsPanel } from './InputsPanel';

function setup(patch: Partial<CalculatorInputs> = {}) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const inputs = { ...DEFAULT_INPUTS, ...patch };
  render(<InputsPanel inputs={inputs} fy="2026-27" onChange={onChange} onReset={onReset} />);
  return { onChange, onReset };
}

describe('InputsPanel', () => {
  it('shows the salary with thousands separators', () => {
    setup({ salary: 120_000 });
    expect(screen.getByLabelText('Pay amount')).toHaveValue('120,000');
  });

  it('leaves the field empty at zero so the placeholder shows', () => {
    setup({ salary: 0 });
    expect(screen.getByLabelText('Pay amount')).toHaveValue('');
  });

  it('strips separators and stray characters out of typed amounts', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '$1,450.50' } });
    expect(onChange).toHaveBeenCalledWith({ salary: 1450.5 });
  });

  it('changes the pay cycle', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Pay cycle'), { target: { value: 'hourly' } });
    expect(onChange).toHaveBeenCalledWith({ payCycle: 'hourly' });
  });

  it('asks for hours per week only on an hourly rate', () => {
    setup();
    expect(screen.queryByText('Hours per week')).toBeNull();
    setup({ payCycle: 'hourly' });
    expect(screen.getByText('Hours per week')).toBeInTheDocument();
  });

  it('falls back to a full week when hours are cleared', () => {
    const { onChange } = setup({ payCycle: 'hourly' });
    fireEvent.change(screen.getByDisplayValue('38'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ hoursPerWeek: 38 });
  });

  it('asks for days per week only on a day rate', () => {
    const { onChange } = setup({ payCycle: 'daily' });
    expect(screen.getByText('Days per week')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith({ daysPerWeek: 4 });
  });

  it('tracks whether the salary includes super in the helper text', () => {
    setup();
    expect(screen.getByText('Excluding super')).toBeInTheDocument();
    setup({ salaryIncludesSuper: true });
    expect(screen.getByText('Package including super')).toBeInTheDocument();
  });

  it('toggles the study loan switch', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /Study loan/ }));
    expect(onChange).toHaveBeenCalledWith({ hasStudentLoan: true });
  });

  it('offers a Medicare exemption level once the exemption is on', () => {
    const { onChange } = setup();
    expect(screen.queryByRole('group', { name: 'Medicare exemption level' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: /Medicare levy exemption/ }));
    expect(onChange).toHaveBeenCalledWith({ medicareExemption: 'full' });

    const { onChange: onChange2 } = setup({ medicareExemption: 'full' });
    fireEvent.click(screen.getByRole('button', { name: 'Half exemption' }));
    expect(onChange2).toHaveBeenCalledWith({ medicareExemption: 'half' });
  });

  it('clears the exemption when switched off', () => {
    const { onChange } = setup({ medicareExemption: 'half' });
    fireEvent.click(screen.getByRole('checkbox', { name: /Medicare levy exemption/ }));
    expect(onChange).toHaveBeenCalledWith({ medicareExemption: 'none' });
  });

  it('hides the Medicare exemption for non-residents, who never pay the levy', () => {
    setup({ category: 'foreign' });
    expect(screen.queryByRole('checkbox', { name: /Medicare levy exemption/ })).toBeNull();
  });

  it('changes the tax status', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue('Australian resident'), {
      target: { value: 'whm' },
    });
    expect(onChange).toHaveBeenCalledWith({ category: 'whm' });
  });

  it('asks for spouse income only when there is a spouse', () => {
    setup();
    expect(screen.queryByText('Spouse income (a year)')).toBeNull();
    const { onChange } = setup({ hasSpouse: true, spouseIncome: 60_000 });
    expect(screen.getByDisplayValue('60,000')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('60,000'), { target: { value: '70000' } });
    expect(onChange).toHaveBeenCalledWith({ spouseIncome: 70_000 });
  });

  it('never lets dependants go negative', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByDisplayValue('0'), { target: { value: '-3' } });
    expect(onChange).toHaveBeenCalledWith({ dependants: 0 });
  });

  it('takes salary sacrifice and other deductions', () => {
    const { onChange } = setup({ salarySacrificeSuper: 5_000, deductions: 1_200 });
    fireEvent.change(screen.getByDisplayValue('5,000'), { target: { value: '6000' } });
    expect(onChange).toHaveBeenCalledWith({ salarySacrificeSuper: 6_000 });
    fireEvent.change(screen.getByDisplayValue('1,200'), { target: { value: '1500' } });
    expect(onChange).toHaveBeenCalledWith({ deductions: 1_500 });
  });

  it('resets everything on request', () => {
    const { onReset } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('does not submit the form', () => {
    const { container } = render(
      <InputsPanel inputs={DEFAULT_INPUTS} fy="2026-27" onChange={() => {}} onReset={() => {}} />,
    );
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    container.querySelector('form')!.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
  });
});
