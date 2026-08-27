import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { FY_DATA, currentFinancialYear } from './data';
import { calculate, DEFAULT_INPUTS } from './engine/calculate';
import { money } from './engine/format';

function url(search = '/') {
  window.history.replaceState(null, '', search);
}

describe('App', () => {
  beforeEach(() => url());

  it('opens on the salary calculator', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Taxman' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My salary' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Take-home pay')).toBeInTheDocument();
    expect(screen.getByLabelText('On your payslip')).toBeInTheDocument();
  });

  it('calculates the default salary for the current financial year', () => {
    render(<App />);
    const fy = currentFinancialYear();
    const expected = calculate(DEFAULT_INPUTS, FY_DATA[fy]);
    expect(screen.getByTestId('take-home-annual')).toHaveTextContent(money(expected.takeHome));
  });

  it('recalculates as the salary is typed and records it in the URL', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '150000' } });
    const expected = calculate(
      { ...DEFAULT_INPUTS, salary: 150_000 },
      FY_DATA[currentFinancialYear()],
    );
    expect(screen.getByTestId('take-home-annual')).toHaveTextContent(money(expected.takeHome));
    expect(window.location.search).toBe('?s=150000');
  });

  it('restores state from a shared URL', () => {
    url('/?s=87500&sl=1&fy=2025-26&v=weekly');
    render(<App />);
    expect(screen.getByLabelText('Pay amount')).toHaveValue('87,500');
    expect(screen.getByLabelText('Financial year')).toHaveValue('2025-26');
    expect(screen.getByRole('button', { name: 'Weekly' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('stsl')).toBeInTheDocument();
  });

  it('changes the financial year', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Financial year'), { target: { value: '2024-25' } });
    const expected = calculate(DEFAULT_INPUTS, FY_DATA['2024-25']);
    expect(screen.getByTestId('take-home-annual')).toHaveTextContent(money(expected.takeHome));
    expect(window.location.search).toContain('fy=2024-25');
  });

  it('switches to the contract comparison', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Contract vs permanent' }));
    expect(screen.getByLabelText('Comparison verdict')).toBeInTheDocument();
    expect(screen.getByLabelText('Contract rate')).toBeInTheDocument();
    expect(window.location.search).toBe('?mode=c');
  });

  it('switches to the mortgage calculator', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Mortgage' }));
    expect(screen.getByLabelText('Repayment summary')).toBeInTheDocument();
    expect(screen.getByTestId('mortgage-repayment')).toBeInTheDocument();
    expect(window.location.search).toBe('?mode=m');
  });

  it('switches to the novated lease calculator', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Novated lease' }));
    expect(screen.getByLabelText('Implied interest rate')).toBeInTheDocument();
    expect(screen.getByTestId('novated-apr')).toBeInTheDocument();
    expect(window.location.search).toBe('?mode=n');
  });

  it('keeps each mode on its own inputs', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '150000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Mortgage' }));
    fireEvent.change(screen.getByLabelText('Property value'), { target: { value: '1500000' } });

    fireEvent.click(screen.getByRole('button', { name: 'My salary' }));
    expect(screen.getByLabelText('Pay amount')).toHaveValue('150,000');
  });

  it('changes the period the amounts are shown in', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }));
    const expected = calculate(DEFAULT_INPUTS, FY_DATA[currentFinancialYear()]);
    expect(screen.getByTestId('take-home')).toHaveTextContent(money(expected.takeHome / 52));
    expect(window.location.search).toBe('?v=weekly');
  });

  it('resets the inputs while staying in the same mode', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Pay amount'), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(screen.getByLabelText('Pay amount')).toHaveValue('100,000');
    expect(screen.getByRole('button', { name: 'My salary' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.location.search).toBe('');
  });

  it('resets the mortgage inputs from mortgage mode', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Mortgage' }));
    fireEvent.change(screen.getByLabelText('Property value'), { target: { value: '1500000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
    expect(screen.getByLabelText('Property value')).toHaveValue('1,000,000');
    expect(window.location.search).toBe('?mode=m');
  });

  it('links to the sources for the year on show', () => {
    render(<App />);
    const fyData = FY_DATA[currentFinancialYear()];
    expect(screen.getByRole('link', { name: 'tax rates' })).toHaveAttribute(
      'href',
      fyData.sources.brackets.url,
    );
    expect(screen.getByRole('link', { name: 'open source' })).toHaveAttribute(
      'href',
      'https://github.com/logan-han/taxman',
    );
  });
});
