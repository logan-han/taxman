const aud = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const audCents = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(v: number): string {
  return aud.format(Math.round(v));
}

export function moneyCents(v: number): string {
  return audCents.format(v);
}

export function percent(v: number): string {
  const p = v * 100;
  return `${Number.isInteger(p) ? p : p.toFixed(2).replace(/\.?0+$/, '')}%`;
}
