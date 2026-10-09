import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ResultBar } from './ResultBar';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let report: Callback;
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(function (this: unknown, cb: Callback) {
      report = cb;
      return { observe: vi.fn(), disconnect };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

function setup() {
  const results = document.createElement('div');
  results.className = 'results';
  results.scrollIntoView = vi.fn();
  document.body.appendChild(results);
  const utils = render(<ResultBar label="Take-home a month" value="$6,457" />);
  return { ...utils, results, bar: utils.container.querySelector('button')! };
}

const below = { isIntersecting: false, boundingClientRect: { top: 1200 } as DOMRectReadOnly };

describe('ResultBar', () => {
  it('stays hidden until the results are known to be off screen', () => {
    const { bar } = setup();
    expect(bar).not.toHaveClass('result-bar--shown');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveAttribute('tabindex', '-1');
  });

  it('shows the figure while the results are below the fold', () => {
    const { bar } = setup();
    act(() => report([below]));
    expect(bar).toHaveClass('result-bar--shown');
    expect(bar).toHaveAttribute('aria-hidden', 'false');
    expect(bar).toHaveAttribute('tabindex', '0');
    expect(screen.getByText('Take-home a month')).toBeInTheDocument();
    expect(screen.getByTestId('result-bar-value')).toHaveTextContent('$6,457');
  });

  it('hides once the results are on screen, or scrolled past', () => {
    const { bar } = setup();
    act(() => report([below]));
    act(() =>
      report([{ isIntersecting: true, boundingClientRect: { top: 200 } as DOMRectReadOnly }]),
    );
    expect(bar).not.toHaveClass('result-bar--shown');
    act(() => report([below]));
    act(() =>
      report([{ isIntersecting: false, boundingClientRect: { top: -3000 } as DOMRectReadOnly }]),
    );
    expect(bar).not.toHaveClass('result-bar--shown');
  });

  it('jumps to the results when tapped', () => {
    const { bar, results } = setup();
    act(() => report([below]));
    fireEvent.click(bar);
    expect(results.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('stops watching on unmount', () => {
    const { unmount } = setup();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
