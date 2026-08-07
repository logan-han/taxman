import type { FinancialYear, FYData } from './types';
import { fy2024_25 } from './fy2024-25';
import { fy2025_26 } from './fy2025-26';
import { fy2026_27 } from './fy2026-27';

export const FY_DATA: Record<FinancialYear, FYData> = {
  '2024-25': fy2024_25,
  '2025-26': fy2025_26,
  '2026-27': fy2026_27,
};

export const FINANCIAL_YEARS = Object.keys(FY_DATA) as FinancialYear[];

/** FY containing `date` (FYs start 1 July), clamped to the years we have data for. */
export function currentFinancialYear(date = new Date()): FinancialYear {
  const y = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  const fy = `${y}-${String((y + 1) % 100).padStart(2, '0')}` as FinancialYear;
  if (fy in FY_DATA) return fy;
  return FINANCIAL_YEARS[FINANCIAL_YEARS.length - 1];
}

export * from './types';
