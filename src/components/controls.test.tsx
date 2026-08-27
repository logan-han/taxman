import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AtoLink, Field, Switch, ToggleGroup } from './controls';

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
