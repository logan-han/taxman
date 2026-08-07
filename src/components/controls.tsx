import type { ReactNode } from 'react';

export function Field(props: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{props.label}</span>
      {props.children}
      {props.helper ? <span className="field__helper">{props.helper}</span> : null}
    </label>
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
