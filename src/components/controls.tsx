import { useLayoutEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

/** Thousands-separated, blank at zero so the placeholder shows. */
export function formatAmount(v: number): string {
  return v === 0 ? '' : v.toLocaleString('en-AU', { maximumFractionDigits: 2 });
}

/** The number in typed text; separators, $ and stray characters are ignored. */
export function parseAmount(raw: string): number {
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Regroup typed text without eating a trailing "." or the cents after it. */
export function regroupTyped(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  const whole = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (dot === -1) return grouped;
  return `${grouped || '0'}.${cleaned
    .slice(dot + 1)
    .replace(/\./g, '')
    .slice(0, 2)}`;
}

const significant = (s: string) => s.replace(/[^0-9.]/g, '').length;

/**
 * Dollar amount typed as text with live thousands separators. Keeps what the
 * user typed while it still reads as the current value, so "45." and "45.50"
 * survive keystroke by keystroke, and holds the caret when commas move.
 */
export function AmountInput({
  value,
  onValueChange,
  onBlur,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  // digits and dots left of the caret, restored after the regrouped render
  const caret = useRef<number | null>(null);
  const text = typed !== null && parseAmount(typed) === value ? typed : formatAmount(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (caret.current === null || !el || document.activeElement !== el) return;
    let i = 0;
    for (let seen = 0; i < el.value.length && seen < caret.current; i++) {
      if (/[0-9.]/.test(el.value[i])) seen++;
    }
    el.setSelectionRange(i, i);
    caret.current = null;
  });

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      ref={ref}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        caret.current = significant(raw.slice(0, e.target.selectionStart ?? raw.length));
        const next = regroupTyped(raw);
        setTyped(next);
        onValueChange(parseAmount(next));
      }}
      onBlur={(e) => {
        setTyped(null);
        onBlur?.(e);
      }}
    />
  );
}

export function Field(props: {
  label: string;
  helper?: string;
  children: ReactNode;
  /**
   * Wrap in a div rather than a label. A label names its first labelable
   * descendant, so around a button group the first button would be announced
   * as the whole field, helper text and all. The group labels itself.
   */
  group?: boolean;
}) {
  const inner = (
    <>
      <span className="field__label">{props.label}</span>
      {props.children}
      {props.helper ? <span className="field__helper">{props.helper}</span> : null}
    </>
  );
  return props.group ? (
    <div className="field">{inner}</div>
  ) : (
    <label className="field">{inner}</label>
  );
}

export function Switch(props: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch">
      <span>
        {props.label}
        {props.hint ? <small>{props.hint}</small> : null}
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span className="switch__track" aria-hidden="true" />
    </label>
  );
}

export function ToggleGroup<T extends string>(props: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="toggle-group" role="group" aria-label={props.ariaLabel}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={props.value === o.value}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AtoLink(props: { href?: string; checked?: string }) {
  if (!props.href) return null;
  return (
    <a
      className="ato-link"
      href={props.href}
      rel="noopener"
      target="_blank"
      title={props.checked ? `ATO source, checked ${props.checked}` : 'ATO source'}
    >
      ATO
    </a>
  );
}
