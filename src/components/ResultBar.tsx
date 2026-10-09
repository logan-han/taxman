import { useEffect, useState } from 'react';

interface Props {
  /** what the figure is, e.g. "Take-home a month" */
  label: string;
  /** the headline figure, e.g. "$6,457" */
  value: string;
}

const RESULTS = '.results';

/**
 * On a phone the inputs stack above the results, so the answer sits a long
 * scroll away while you type. This bar carries the headline figure until the
 * results come into view, and jumps to them when tapped. CSS keeps it to
 * single-column layouts.
 */
export function ResultBar({ label, value }: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const target = document.querySelector(RESULTS);
    if (!target || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top > 0),
      // results count as seen once their top clears the bar's height
      { rootMargin: '0px 0px -120px 0px' },
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <button
      type="button"
      className={`result-bar${shown ? ' result-bar--shown' : ''}`}
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      onClick={() => document.querySelector(RESULTS)?.scrollIntoView({ behavior: 'smooth' })}
    >
      <span className="result-bar__label">{label}</span>
      <b className="result-bar__value" data-testid="result-bar-value">
        {value}
      </b>
      <span className="visually-hidden">, show the details</span>
      <span className="result-bar__go" aria-hidden="true">
        ↓
      </span>
    </button>
  );
}
