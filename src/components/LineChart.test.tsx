import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LineChart } from './LineChart';

const times = [2026, 2027, 2028, 2029, 2030];
const series = [
  { label: 'Interest', color: '#9c5e09', values: [500, 400, 300, 200, 100], stacked: true },
  { label: 'Principal', color: '#3866b0', values: [100, 200, 300, 400, 500], stacked: true },
];

const fmt = (v: number) => `$${Math.round(v)}`;

describe('LineChart', () => {
  it('renders nothing with fewer than two points', () => {
    const { container } = render(
      <LineChart ariaLabel="Too short" times={[2026]} series={series} formatValue={fmt} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('draws one line per series plus a legend', () => {
    const { container } = render(
      <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
    );
    expect(screen.getByRole('img', { name: 'Repayment split' })).toBeInTheDocument();
    expect(screen.getByText('Interest')).toBeInTheDocument();
    expect(screen.getByText('Principal')).toBeInTheDocument();
    // stacked series get a filled area as well as the line
    expect(container.querySelectorAll('path[fill="none"]')).toHaveLength(2);
    expect(container.querySelectorAll('path[fill="#9c5e09"]')).toHaveLength(1);
  });

  it('omits the area fill for unstacked series', () => {
    const { container } = render(
      <LineChart
        ariaLabel="Value and equity"
        times={times}
        series={[{ label: 'Market value', color: '#3866b0', values: [1, 2, 3, 4, 5] }]}
        formatValue={fmt}
      />,
    );
    expect(container.querySelectorAll('path[fill="none"]')).toHaveLength(1);
    expect(container.querySelectorAll('path[fill="#3866b0"]')).toHaveLength(0);
  });

  it('labels the y axis with the caller formatter', () => {
    render(
      <LineChart
        ariaLabel="Repayment split"
        times={times}
        series={series}
        formatValue={(v) => `${v} units`}
      />,
    );
    expect(screen.getByText('0 units')).toBeInTheDocument();
  });

  it('shows a tooltip on hover and clears it on leave', () => {
    const { container } = render(
      <LineChart
        ariaLabel="Repayment split"
        times={times}
        series={series}
        formatValue={fmt}
        tooltipExtras={() => ['Rate 6.00%']}
      />,
    );
    const svg = screen.getByRole('img', { name: 'Repayment split' });

    fireEvent.mouseMove(svg, { clientX: 400 });
    expect(container.querySelector('.chart__tooltip')).not.toBeNull();
    expect(screen.getByText('Rate 6.00%')).toBeInTheDocument();
    // a crosshair and one marker per series
    expect(container.querySelectorAll('circle')).toHaveLength(2);

    fireEvent.mouseLeave(svg);
    expect(container.querySelector('.chart__tooltip')).toBeNull();
  });

  it('flips the tooltip to the left near the right edge', () => {
    const { container } = render(
      <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
    );
    const svg = screen.getByRole('img', { name: 'Repayment split' });

    // jsdom reports a zero-width box, so clientX 0 lands on the first point and
    // anything positive lands on the last one
    fireEvent.mouseMove(svg, { clientX: 0 });
    expect(container.querySelector<HTMLElement>('.chart__tooltip')!.style.left).not.toBe('');

    fireEvent.mouseMove(svg, { clientX: 400 });
    expect(container.querySelector<HTMLElement>('.chart__tooltip')!.style.right).not.toBe('');
  });
});
