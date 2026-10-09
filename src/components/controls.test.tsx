import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AmountInput,
  AtoLink,
  Field,
  Switch,
  ToggleGroup,
  formatAmount,
  parseAmount,
  regroupTyped,
} from './controls';

describe('amount text helpers', () => {
  it('formats with separators and blanks zero', () => {
    expect(formatAmount(0)).toBe('');
    expect(formatAmount(120_000)).toBe('120,000');
    expect(formatAmount(1_450.5)).toBe('1,450.5');
  });

  it('parses typed text, ignoring $ and separators', () => {
    expect(parseAmount('$1,450.50')).toBe(1_450.5);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('1.2.3')).toBe(0);
  });

  it('regroups typed text but keeps a trailing dot and up to two decimals', () => {
    expect(regroupTyped('1234567')).toBe('1,234,567');
    expect(regroupTyped('45.')).toBe('45.');
    expect(regroupTyped('45.50')).toBe('45.50');
    expect(regroupTyped('45.505')).toBe('45.50');
    expect(regroupTyped('.5')).toBe('0.5');
    expect(regroupTyped('1.2.3')).toBe('1.23');
    expect(regroupTyped('$1,450.50')).toBe('1,450.50');
    expect(regroupTyped('007')).toBe('7');
    expect(regroupTyped('')).toBe('');
  });
});

function Harness({ initial = 0, onValue }: { initial?: number; onValue?: (v: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <AmountInput
        aria-label="Amount"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
      <button type="button" onClick={() => setValue(500)}>
        Set elsewhere
      </button>
    </>
  );
}

describe('AmountInput', () => {
  it('lets a decimal be typed one key at a time', () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByLabelText('Amount');
    for (const typed of ['4', '45', '45.', '45.5', '45.50']) {
      fireEvent.change(input, { target: { value: typed } });
      expect(input).toHaveValue(typed);
    }
    expect(onValue.mock.calls.map(([v]) => v)).toEqual([4, 45, 45, 45.5, 45.5]);
  });

  it('adds separators as you type and tidies up on blur', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Amount');
    fireEvent.change(input, { target: { value: '1234567.5' } });
    expect(input).toHaveValue('1,234,567.5');
    fireEvent.change(input, { target: { value: '1,234,567.50' } });
    expect(input).toHaveValue('1,234,567.50');
    fireEvent.blur(input);
    expect(input).toHaveValue('1,234,567.5');
  });

  it('shows a value set from outside instead of stale typing', () => {
    render(<Harness initial={100} />);
    const input = screen.getByLabelText('Amount');
    fireEvent.change(input, { target: { value: '45.' } });
    fireEvent.click(screen.getByText('Set elsewhere'));
    expect(input).toHaveValue('500');
  });

  it('keeps the caret beside the digit just typed when separators move', () => {
    render(<Harness initial={100_000} />);
    const input = screen.getByLabelText<HTMLInputElement>('Amount');
    input.focus();
    // a "5" typed after the leading 1 of "100,000"
    fireEvent.change(input, { target: { value: '1500,000', selectionStart: 2, selectionEnd: 2 } });
    expect(input).toHaveValue('1,500,000');
    expect(input.selectionStart).toBe(3);
  });

  it('passes through input attributes', () => {
    render(<AmountInput aria-label="Fee" placeholder="0" value={0} onValueChange={() => {}} />);
    expect(screen.getByLabelText('Fee')).toHaveAttribute('placeholder', '0');
    expect(screen.getByLabelText('Fee')).toHaveAttribute('inputmode', 'decimal');
  });
});

describe('Field', () => {
  it('labels its child and shows the helper when given', () => {
    render(
      <Field label="Salary" helper="Excluding super">
        <input aria-label="Salary input" />
      </Field>,
    );
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('Excluding super')).toBeInTheDocument();
    expect(screen.getByLabelText('Salary input')).toBeInTheDocument();
  });

  it('labels a plain input through the wrapping label', () => {
    render(
      <Field label="Deposit">
        <input />
      </Field>,
    );
    expect(screen.getByLabelText('Deposit')).toBeInTheDocument();
  });

  it('leaves a button group to name itself', () => {
    render(
      <Field group label="Vehicle" helper="PHEVs count as non-EV">
        <ToggleGroup
          ariaLabel="Vehicle type"
          options={[
            { label: 'EV', value: 'bev' },
            { label: 'Non-EV', value: 'ice' },
          ]}
          value="bev"
          onChange={() => {}}
        />
      </Field>,
    );
    // a <label> wrapper would name this button after the whole field instead
    expect(screen.getByRole('button', { name: 'EV' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Vehicle type' })).toBeInTheDocument();
    expect(screen.getByText('Vehicle')).toBeInTheDocument();
    expect(screen.getByText('PHEVs count as non-EV')).toBeInTheDocument();
  });

  it('omits the helper when there is none', () => {
    const { container } = render(
      <Field label="Salary">
        <input />
      </Field>,
    );
    expect(container.querySelector('.field__helper')).toBeNull();
  });
});

describe('Switch', () => {
  it('reflects the checked state and reports changes', () => {
    const onChange = vi.fn();
    render(<Switch label="Study loan" hint="HELP" checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox');
    expect(box).not.toBeChecked();
    expect(screen.getByText('HELP')).toBeInTheDocument();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reports unchecking', () => {
    const onChange = vi.fn();
    render(<Switch label="Study loan" checked onChange={onChange} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('ToggleGroup', () => {
  const options = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Annually', value: 'annually' },
  ];

  it('marks the selected option pressed', () => {
    render(
      <ToggleGroup ariaLabel="Period" options={options} value="annually" onChange={() => {}} />,
    );
    expect(screen.getByRole('group', { name: 'Period' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annually' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Weekly' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits the value of the clicked option', () => {
    const onChange = vi.fn();
    render(
      <ToggleGroup ariaLabel="Period" options={options} value="annually" onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    expect(onChange).toHaveBeenCalledWith('weekly');
  });
});

describe('AtoLink', () => {
  it('renders nothing without an href', () => {
    const { container } = render(<AtoLink />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the checked date in the title when supplied', () => {
    render(<AtoLink href="https://ato.gov.au/rates" checked="2026-08-01" />);
    const link = screen.getByRole('link', { name: 'ATO' });
    expect(link).toHaveAttribute('href', 'https://ato.gov.au/rates');
    expect(link).toHaveAttribute('title', 'ATO source, checked 2026-08-01');
  });

  it('falls back to a plain title without a checked date', () => {
    render(<AtoLink href="https://ato.gov.au/rates" />);
    expect(screen.getByRole('link', { name: 'ATO' })).toHaveAttribute('title', 'ATO source');
  });
});
