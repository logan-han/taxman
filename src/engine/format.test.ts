import { describe, it, expect } from 'vitest';
import { money, moneyCents, percent } from './format';

describe('money', () => {
  it('formats whole dollars with no cents', () => {
    expect(money(1234)).toBe('$1,234');
    expect(money(1_234_567)).toBe('$1,234,567');
  });

  it('rounds to the nearest dollar', () => {
    expect(money(1234.4)).toBe('$1,234');
    expect(money(1234.5)).toBe('$1,235');
  });

  it('keeps the sign on negatives', () => {
    expect(money(-987.6)).toBe('-$988');
  });

  it('formats zero', () => {
    expect(money(0)).toBe('$0');
  });
});

describe('moneyCents', () => {
  it('always shows two decimal places', () => {
    expect(moneyCents(1234.5)).toBe('$1,234.50');
    expect(moneyCents(10)).toBe('$10.00');
  });

  it('rounds to cents', () => {
    expect(moneyCents(-12.345)).toBe('-$12.35');
  });
});

describe('percent', () => {
  it('drops the decimals on whole percentages', () => {
    expect(percent(0.45)).toBe('45%');
    expect(percent(0)).toBe('0%');
    expect(percent(1)).toBe('100%');
  });

  it('keeps two decimals when needed, without trailing zeros', () => {
    expect(percent(0.0125)).toBe('1.25%');
    expect(percent(0.185)).toBe('18.5%');
  });
});
