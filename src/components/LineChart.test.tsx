import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
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

  it('shows a tooltip under the mouse and clears it on leave', () => {
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

    fireEvent.pointerMove(svg, { clientX: 400, pointerType: 'mouse' });
    expect(container.querySelector('.chart__tooltip')).not.toBeNull();
    expect(screen.getByText('Rate 6.00%')).toBeInTheDocument();
    // a crosshair and one marker per series
    expect(container.querySelectorAll('circle')).toHaveLength(2);

    fireEvent.pointerLeave(svg, { pointerType: 'mouse' });
    expect(container.querySelector('.chart__tooltip')).toBeNull();
  });

  it('keeps a tapped readout after the finger lifts, until focus moves on', () => {
    const { container } = render(
      <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
    );
    const svg = screen.getByRole('img', { name: 'Repayment split' });
    fireEvent.pointerDown(svg, { clientX: 400, pointerType: 'touch' });
    fireEvent.pointerLeave(svg, { pointerType: 'touch' });
    expect(container.querySelector('.chart__tooltip')).not.toBeNull();
    fireEvent.blur(svg);
    expect(container.querySelector('.chart__tooltip')).toBeNull();
  });

  it('drops the readout when the browser takes a touch over to scroll', () => {
    const { container } = render(
      <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
    );
    const svg = screen.getByRole('img', { name: 'Repayment split' });
    fireEvent.pointerDown(svg, { clientX: 400, pointerType: 'touch' });
    fireEvent.pointerCancel(svg, { pointerType: 'touch' });
    expect(container.querySelector('.chart__tooltip')).toBeNull();
  });

  it('flips the tooltip to the left near the right edge', () => {
    const { container } = render(
      <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
    );
    const svg = screen.getByRole('img', { name: 'Repayment split' });

    // jsdom reports a zero-width box, so clientX 0 lands on the first point and
    // anything positive lands on the last one
    fireEvent.pointerMove(svg, { clientX: 0, pointerType: 'mouse' });
    expect(container.querySelector<HTMLElement>('.chart__tooltip')!.style.left).not.toBe('');

    fireEvent.pointerMove(svg, { clientX: 400, pointerType: 'mouse' });
    expect(container.querySelector<HTMLElement>('.chart__tooltip')!.style.right).not.toBe('');
  });

  it('steps through the years from the keyboard and announces each point', () => {
    const { container } = render(
      <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
    );
    const svg = screen.getByRole('img', { name: 'Repayment split' });
    expect(svg).toHaveAttribute('tabindex', '0');
    expect(svg).toHaveAccessibleDescription('Arrow keys step through the years.');
    const live = container.querySelector('[aria-live]')!;

    fireEvent.focus(svg);
    expect(live).toHaveTextContent('2026, Interest $500, Principal $100');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(live).toHaveTextContent('2027, Interest $400, Principal $200');
    fireEvent.keyDown(svg, { key: 'End' });
    expect(live).toHaveTextContent('2030, Interest $100, Principal $500');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(live).toHaveTextContent('2030');
    fireEvent.keyDown(svg, { key: 'Home' });
    expect(live).toHaveTextContent('2026');
    fireEvent.keyDown(svg, { key: 'ArrowLeft' });
    expect(live).toHaveTextContent('2026');
    fireEvent.keyDown(svg, { key: 'Escape' });
    expect(container.querySelector('.chart__tooltip')).toBeNull();
  });

  it('keeps mouse readouts out of the live region', () => {
    const { container } = render(
      <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
    );
    fireEvent.pointerMove(screen.getByRole('img', { name: 'Repayment split' }), {
      clientX: 400,
      pointerType: 'mouse',
    });
    expect(container.querySelector('[aria-live]')).toBeEmptyDOMElement();
  });

  it('draws at the measured container width', () => {
    const observers: (() => void)[] = [];
    const RO = vi.fn(function (this: unknown, cb: () => void) {
      observers.push(cb);
      return { observe: vi.fn(), disconnect: vi.fn() };
    });
    vi.stubGlobal('ResizeObserver', RO);
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(340);
    try {
      render(
        <LineChart ariaLabel="Repayment split" times={times} series={series} formatValue={fmt} />,
      );
      const svg = screen.getByRole('img', { name: 'Repayment split' });
      expect(svg).toHaveAttribute('viewBox', '0 0 340 240');
      width.mockReturnValue(200);
      act(() => observers.forEach((cb) => cb()));
      // never narrower than the minimum drawing width
      expect(svg).toHaveAttribute('viewBox', '0 0 280 240');
    } finally {
      width.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
