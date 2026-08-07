/**
 * Home loan modelling.
 *
 * The schedule is simulated period by period (weekly, fortnightly or monthly).
 * Interest accrues at the annual rate divided by periods per year. The
 * variable rate follows a piecewise-linear curve through three anchors:
 * today's rate, a near-term forecast and a long-term forecast, flat after.
 * When the rate changes, the repayment is re-amortised over the remaining
 * term, which is how lenders adjust variable repayments.
 *
 * Fixed options hold the input rate for the fixed period, then roll to the
 * forecast curve. Interest-only years pay interest alone (on the input rate
 * or curve as applicable), then amortise principal over the remaining term.
 * A split loan is two portions simulated independently and summed.
 *
 * Property value follows its own near/long growth-rate curve, compounded
 * monthly. Equity = value - total remaining balance.
 */

export type RepaymentFrequency = 'monthly' | 'fortnightly' | 'weekly';

export type InterestOption =
  | 'variable'
  | 'fixed6m'
  | 'fixed1y'
  | 'fixed2y'
  | 'fixed3y'
  | 'fixed5y'
  | 'fixedFull'
  | 'interestOnly';

export const FIXED_YEARS: Record<InterestOption, number | 'full' | null> = {
  variable: null,
  fixed6m: 0.5,
  fixed1y: 1,
  fixed2y: 2,
  fixed3y: 3,
  fixed5y: 5,
  fixedFull: 'full',
  interestOnly: null,
};

export interface LoanPortion {
  amount: number;
  /** annual rate as a percent, e.g. 6.0 */
  ratePercent: number;
  option: InterestOption;
  /** interest-only years before principal-and-interest (0 = none) */
  interestOnlyYears: number;
}

export interface Forecast {
  /** calendar year the near-term anchor lands on */
  nearYear: number;
  nearPercent: number;
  longYear: number;
  longPercent: number;
}

export interface MortgageInputs {
  /** jurisdiction used for the stamp duty estimate (UI convenience) */
  dutyState: import('./compare').AuState;
  existing: boolean;
  /** first repayment date */
  startYear: number;
  startMonth: number; // 1-12
  propertyValue: number;
  deposit: number;
  /** stamp duty, legal and lender fees paid upfront (not borrowed) */
  upfrontFees: number;
  termYears: number;
  frequency: RepaymentFrequency;
  portions: LoanPortion[];
  split: boolean;
  /** extra repayment per period, on top of the required amount */
  extraPerPeriod: number;
  rateForecast: Forecast;
  growthForecast: Forecast;
}

export function defaultMortgage(currentYear: number): MortgageInputs {
  return {
    dutyState: 'NSW',
    existing: false,
    startYear: currentYear,
    startMonth: 8,
    propertyValue: 1_000_000,
    deposit: 200_000,
    upfrontFees: 0,
    termYears: 30,
    frequency: 'monthly',
    portions: [
      { amount: 800_000, ratePercent: 6.0, option: 'variable', interestOnlyYears: 0 },
      { amount: 0, ratePercent: 6.0, option: 'fixed2y', interestOnlyYears: 0 },
    ],
    split: false,
    extraPerPeriod: 0,
    rateForecast: { nearYear: currentYear + 3, nearPercent: 6.0, longYear: currentYear + 13, longPercent: 6.0 },
    growthForecast: { nearYear: currentYear + 8, nearPercent: 4.0, longYear: currentYear + 17, longPercent: 4.0 },
  };
}

export const PERIODS_PER_YEAR: Record<RepaymentFrequency, number> = {
  monthly: 12,
  fortnightly: 26,
  weekly: 52,
};

/** piecewise-linear percent curve through (startYear, startPercent) -> anchors */
export function rateAt(
  yearsFromStart: number,
  startPercent: number,
  f: Forecast,
  startYear: number,
): number {
  const nearT = Math.max(0.0001, f.nearYear - startYear);
  const longT = Math.max(nearT + 0.0001, f.longYear - startYear);
  if (yearsFromStart <= 0) return startPercent;
  if (yearsFromStart >= longT) return f.longPercent;
  if (yearsFromStart <= nearT) {
    return startPercent + (f.nearPercent - startPercent) * (yearsFromStart / nearT);
  }
  return (
    f.nearPercent + (f.longPercent - f.nearPercent) * ((yearsFromStart - nearT) / (longT - nearT))
  );
}

export function amortisedRepayment(principal: number, annualPercent: number, periods: number, periodsPerYear: number): number {
  if (principal <= 0 || periods <= 0) return 0;
  const r = annualPercent / 100 / periodsPerYear;
  if (r === 0) return principal / periods;
  return (principal * r) / (1 - Math.pow(1 + r, -periods));
}

export interface SchedulePoint {
  /** fractional calendar year of this period */
  t: number;
  repayment: number;
  interest: number;
  principal: number;
  balance: number;
  ratePercent: number;
  propertyValue: number;
  equity: number;
  lvr: number;
}

export interface MortgageResult {
  loanAmount: number;
  lvrAtStart: number;
  initialRepayment: number;
  points: SchedulePoint[];
  totalInterest: number;
  totalPayments: number;
  payoffYears: number;
  /** against the same loan with no extra repayments */
  interestSavedByExtras: number;
  yearsSavedByExtras: number;
  endPropertyValue: number;
  endEquity: number;
  initialCosts: number;
}

interface PortionState {
  balance: number;
  ratePercent: number;
  repayment: number;
  fixedUntilYears: number | 'full' | null;
  ioUntilYears: number;
  startPercent: number;
}

function simulate(inputs: MortgageInputs, extraPerPeriod: number): {
  points: SchedulePoint[];
  totalInterest: number;
  totalPayments: number;
  payoffYears: number;
  initialRepayment: number;
} {
  const ppy = PERIODS_PER_YEAR[inputs.frequency];
  const totalPeriods = Math.round(inputs.termYears * ppy);
  const portions = (inputs.split ? inputs.portions : inputs.portions.slice(0, 1)).filter(
    (p) => p.amount > 0,
  );

  const states: (PortionState & { wasIO: boolean })[] = portions.map((p) => {
    const fixed = FIXED_YEARS[p.option];
    return {
      balance: p.amount,
      ratePercent: p.ratePercent,
      repayment: 0,
      fixedUntilYears: fixed === 'full' ? 'full' : fixed,
      ioUntilYears: p.option === 'interestOnly' ? inputs.termYears : p.interestOnlyYears,
      startPercent: p.ratePercent,
      wasIO: false,
    };
  });

  const points: SchedulePoint[] = [];
  let totalInterest = 0;
  let totalPayments = 0;
  let payoffYears = inputs.termYears;
  let initialRepayment = 0;
  let paidOff = false;

  const startT = inputs.startYear + (inputs.startMonth - 1) / 12;

  for (let k = 0; k < totalPeriods && !paidOff; k++) {
    const yearsFrom = k / ppy;
    let periodRepayment = 0;
    let periodInterest = 0;
    let periodPrincipal = 0;
    let weightedRate = 0;
    let openBalance = 0;

    for (const s of states) {
      if (s.balance <= 0) continue;
      openBalance += s.balance;

      // current rate for this portion
      const inFixed =
        s.fixedUntilYears === 'full' ||
        (typeof s.fixedUntilYears === 'number' && yearsFrom < s.fixedUntilYears);
      const targetRate = inFixed
        ? s.startPercent
        : rateAt(yearsFrom, s.startPercent, inputs.rateForecast, inputs.startYear);

      const inIO = yearsFrom < s.ioUntilYears;
      const remainingPeriods = totalPeriods - k;
      const rateChanged = Math.abs(targetRate - s.ratePercent) > 1e-9;
      const ioEnded = s.wasIO && !inIO;
      if (k === 0 || rateChanged || ioEnded || s.repayment === 0) {
        s.ratePercent = targetRate;
        s.repayment = inIO
          ? (s.balance * targetRate) / 100 / ppy
          : amortisedRepayment(s.balance, targetRate, Math.max(1, remainingPeriods), ppy);
      }
      s.wasIO = inIO;

      const r = s.ratePercent / 100 / ppy;
      const interest = s.balance * r;
      const pay = inIO ? interest : Math.min(s.repayment, s.balance + interest);
      const principalPaid = pay - interest;

      periodInterest += interest;
      periodRepayment += pay;
      periodPrincipal += principalPaid;
      weightedRate += s.ratePercent * s.balance;
      s.balance = Math.max(0, s.balance - principalPaid);
    }

    if (k === 0) initialRepayment = periodRepayment;

    // extra repayments come off the first open P&I portion
    if (extraPerPeriod > 0) {
      for (const s of states) {
        if (s.balance <= 0 || yearsFrom < s.ioUntilYears) continue;
        const extra = Math.min(extraPerPeriod, s.balance);
        s.balance -= extra;
        periodRepayment += extra;
        periodPrincipal += extra;
        break;
      }
    }

    const remaining = states.reduce((sum, s) => sum + s.balance, 0);
    totalInterest += periodInterest;
    totalPayments += periodRepayment;

    const t = startT + (k + 1) / ppy;
    const growth = rateAt(yearsFrom, inputs.growthForecast.nearPercent, inputs.growthForecast, inputs.startYear);
    // compound property growth continuously via per-period application below
    const prevValue = points.length ? points[points.length - 1].propertyValue : inputs.propertyValue;
    const propertyValue = prevValue * Math.pow(1 + growth / 100, 1 / ppy);

    points.push({
      t,
      repayment: periodRepayment,
      interest: periodInterest,
      principal: periodPrincipal,
      balance: remaining,
      ratePercent: openBalance > 0 ? weightedRate / openBalance : 0,
      propertyValue,
      equity: propertyValue - remaining,
      lvr: propertyValue > 0 ? remaining / propertyValue : 0,
    });

    if (remaining <= 0.005) {
      paidOff = true;
      payoffYears = (k + 1) / ppy;
    }
  }

  return { points, totalInterest, totalPayments, payoffYears, initialRepayment };
}

export function calculateMortgage(inputs: MortgageInputs): MortgageResult {
  const portions = (inputs.split ? inputs.portions : inputs.portions.slice(0, 1)).filter(
    (p) => p.amount > 0,
  );
  const loanAmount = portions.reduce((sum, p) => sum + p.amount, 0);
  const run = simulate(inputs, inputs.extraPerPeriod);
  const baseline =
    inputs.extraPerPeriod > 0 ? simulate(inputs, 0) : run;

  const last = run.points[run.points.length - 1];
  return {
    loanAmount,
    lvrAtStart: inputs.propertyValue > 0 ? loanAmount / inputs.propertyValue : 0,
    initialRepayment: run.initialRepayment,
    points: run.points,
    totalInterest: run.totalInterest,
    totalPayments: run.totalPayments,
    payoffYears: run.payoffYears,
    interestSavedByExtras: baseline.totalInterest - run.totalInterest,
    yearsSavedByExtras: baseline.payoffYears - run.payoffYears,
    endPropertyValue: last?.propertyValue ?? inputs.propertyValue,
    endEquity: last?.equity ?? inputs.propertyValue - loanAmount,
    initialCosts: inputs.deposit + inputs.upfrontFees,
  };
}
