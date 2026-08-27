import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FY_DATA } from '../data';
import { calculate, DEFAULT_INPUTS } from '../engine/calculate';
import { BracketsCard } from './BracketsCard';

const fyData = FY_DATA['2026-27'];

describe('BracketsCard', () => {
  it('shows a row per resident bracket, with the marginal rate as a chip', () => {
    const result = calculate(DEFAULT_INPUTS, fyData);
    const { container } = render(
      <BracketsCard result={result} fyData={fyData} category="resident" />,
    );
    expect(container.querySelectorAll('.brackets__row')).toHaveLength(
      fyData.residentBrackets.length,
    );
    expect(screen.getByText('Nil')).toBeInTheDocument();
    expect(container.querySelector('.brackets__note')).toHaveTextContent(
      'Resident rates for 2026-27.',
    );
    // $100k sits in the third bracket of the resident scale
    expect(screen.getByText(/Marginal rate/)).toHaveTextContent('30%');
  });

  it('greys out the brackets the income never reaches', () => {
    const result = calculate({ ...DEFAULT_INPUTS, salary: 30_000 }, fyData);
    const { container } = render(
      <BracketsCard result={result} fyData={fyData} category="resident" />,
    );
    const inactive = container.querySelectorAll('.brackets__row--inactive');
    expect(inactive.length).toBeGreaterThan(0);
    expect(inactive.length).toBeLessThan(fyData.residentBrackets.length);
  });

  it('uses the foreign resident scale and note', () => {
    const result = calculate({ ...DEFAULT_INPUTS, category: 'foreign' }, fyData);
    const { container } = render(
      <BracketsCard result={result} fyData={fyData} category="foreign" />,
    );
    expect(container.querySelectorAll('.brackets__row')).toHaveLength(
      fyData.foreignBrackets.length,
    );
    expect(screen.getByText(/no tax-free threshold, no Medicare levy/)).toBeInTheDocument();
  });

  it('uses the working holiday maker scale and note', () => {
    const result = calculate({ ...DEFAULT_INPUTS, category: 'whm' }, fyData);
    const { container } = render(<BracketsCard result={result} fyData={fyData} category="whm" />);
    expect(container.querySelectorAll('.brackets__row')).toHaveLength(fyData.whmBrackets.length);
    expect(screen.getByText(/Working holiday maker rates/)).toBeInTheDocument();
  });

  it('explains that the tax-free threshold still applies to the annual assessment', () => {
    const result = calculate({ ...DEFAULT_INPUTS, category: 'residentNoTFT' }, fyData);
    render(<BracketsCard result={result} fyData={fyData} category="residentNoTFT" />);
    expect(screen.getByText(/the tax-free threshold still applies/)).toBeInTheDocument();
  });

  it('flags a year whose figures come from legislation rather than an ATO table', () => {
    const result = calculate(DEFAULT_INPUTS, fyData);
    render(
      <BracketsCard
        result={result}
        fyData={{ ...fyData, hasDerivedFigures: true }}
        category="resident"
      />,
    );
    expect(screen.getByText(/the ATO is yet to publish its bracket table/)).toBeInTheDocument();
  });

  it('reports a zero effective rate on no income', () => {
    const result = calculate({ ...DEFAULT_INPUTS, salary: 0 }, fyData);
    render(<BracketsCard result={result} fyData={fyData} category="resident" />);
    expect(screen.getByText('Effective rate 0.0%')).toBeInTheDocument();
    expect(screen.getByText('Marginal rate 0%')).toBeInTheDocument();
  });
});
