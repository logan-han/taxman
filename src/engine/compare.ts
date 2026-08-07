import type { FYData } from '../data';
import { calculate, DEFAULT_INPUTS } from './calculate';
import type { CalculationResult } from './calculate';

/**
 * Contractor vs permanent comparison.
 *
 * Work-year model: a contractor is only paid for days actually worked, so
 * paid days = work days per year - public holidays - annual leave - sick days.
 * A permanent employee is paid for all of them.
 *
 * Each side runs through the full annual engine (brackets, LITO, Medicare levy
 * with shade-in, MLS, study loans), so the tax side is not simplified. Super
 * uses the side's own rate: either carved out of the quoted amount or added on
 * top of it. GST, business expenses, insurances and PSI rules are out of scope.
 */

export type AuState = 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT';

/**
 * Typical statewide gazetted public holidays used as editable defaults.
 * Counts vary by year and region (regional show days, part-day holidays),
 * so the field stays user-adjustable.
 */
export const STATE_PUBLIC_HOLIDAYS: Record<AuState, number> = {
  ACT: 14,
  NSW: 12,
  NT: 13,
  QLD: 12,
  SA: 13,
  TAS: 11,
  VIC: 14,
  WA: 13,
};

export const AU_STATES = Object.keys(STATE_PUBLIC_HOLIDAYS).sort() as AuState[];

export interface CompareInputs {
  /** shared work-year assumptions */
  state: AuState;
  publicHolidayDays: number;
  annualLeaveDays: number;
  sickDays: number;
  workDaysPerYear: number;
  hoursPerDay: number;
  /** applies to both sides */
  hasStudentLoan: boolean;
  privateHospitalCover: boolean;
  /** contract side */
  contractRate: number;
  contractTimeUnit: 'daily' | 'hourly';
  contractIncludesSuper: boolean;
  contractSuperPercent: number;
  /** permanent side */
  permSalary: number;
  permBonus: number;
  permIncludesSuper: boolean;
  permSuperPercent: number;
}

export const DEFAULT_COMPARE: CompareInputs = {
  state: 'NSW',
  publicHolidayDays: 12,
  annualLeaveDays: 20,
  sickDays: 5,
  workDaysPerYear: 260,
  hoursPerDay: 7.5,
  hasStudentLoan: false,
  privateHospitalCover: false,
  contractRate: 700,
  contractTimeUnit: 'daily',
  contractIncludesSuper: false,
  contractSuperPercent: 12,
  permSalary: 130_000,
  permBonus: 0,
  permIncludesSuper: false,
  permSuperPercent: 12,
};

export interface SideResult {
  /** total package including super */
  packageTotal: number;
  taxableIncome: number;
  superAmount: number;
  result: CalculationResult;
  takeHome: number;
}

export interface CompareResult {
  contractPaidDays: number;
  contractRatePerDay: number;
  contract: SideResult;
  permanent: SideResult;
  /** contract take-home minus permanent take-home */
  deltaTakeHome: number;
  /** delta as a share of permanent take-home */
  deltaPercent: number;
  /** delta including super difference */
  deltaWithSuper: number;
}

function splitSuper(
  amount: number,
  percent: number,
  includesSuper: boolean,
): { exSuper: number; superAmount: number } {
  const rate = Math.max(0, percent) / 100;
  if (includesSuper) {
    const exSuper = amount / (1 + rate);
    return { exSuper, superAmount: amount - exSuper };
  }
  return { exSuper: amount, superAmount: amount * rate };
}

function sideFor(
  exSuper: number,
  superAmount: number,
  shared: CompareInputs,
  fy: FYData,
): SideResult {
  const result = calculate(
    {
      ...DEFAULT_INPUTS,
      salary: exSuper,
      payCycle: 'annual',
      hasStudentLoan: shared.hasStudentLoan,
      privateHospitalCover: shared.privateHospitalCover,
    },
    fy,
  );
  return {
    packageTotal: exSuper + superAmount,
    taxableIncome: result.taxableIncome,
    superAmount,
    result,
    takeHome: result.takeHome,
  };
}

export function compareContractPermanent(inputs: CompareInputs, fy: FYData): CompareResult {
  const nonWorking =
    Math.max(0, inputs.publicHolidayDays) +
    Math.max(0, inputs.annualLeaveDays) +
    Math.max(0, inputs.sickDays);
  const contractPaidDays = Math.min(
    Math.max(0, inputs.workDaysPerYear - nonWorking),
    Math.max(0, inputs.workDaysPerYear),
  );

  const contractRatePerDay =
    inputs.contractTimeUnit === 'hourly'
      ? inputs.contractRate * inputs.hoursPerDay
      : inputs.contractRate;
  const contractAnnual = contractRatePerDay * contractPaidDays;
  const contractSplit = splitSuper(
    contractAnnual,
    inputs.contractSuperPercent,
    inputs.contractIncludesSuper,
  );

  const permTotal = inputs.permSalary + Math.max(0, inputs.permBonus);
  const permSplit = splitSuper(permTotal, inputs.permSuperPercent, inputs.permIncludesSuper);

  const contract = sideFor(contractSplit.exSuper, contractSplit.superAmount, inputs, fy);
  const permanent = sideFor(permSplit.exSuper, permSplit.superAmount, inputs, fy);

  const deltaTakeHome = contract.takeHome - permanent.takeHome;
  const deltaPercent = permanent.takeHome > 0 ? deltaTakeHome / permanent.takeHome : 0;
  const deltaWithSuper =
    contract.takeHome + contract.superAmount - (permanent.takeHome + permanent.superAmount);

  return {
    contractPaidDays,
    contractRatePerDay,
    contract,
    permanent,
    deltaTakeHome,
    deltaPercent,
    deltaWithSuper,
  };
}
