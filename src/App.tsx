import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { FY_DATA, FINANCIAL_YEARS, currentFinancialYear } from './data';
import type { FinancialYear } from './data';
import { calculate } from './engine/calculate';
import type { CalculatorInputs } from './engine/calculate';
import { compareContractPermanent } from './engine/compare';
import type { CompareInputs } from './engine/compare';
import { calculateMortgage } from './engine/mortgage';
import type { MortgageInputs } from './engine/mortgage';
import { calculateNovatedLease } from './engine/novatedLease';
import type { NovatedLeaseInputs } from './engine/novatedLease';
import { MortgageInputsPanel } from './components/MortgageInputs';
import { MortgageResults } from './components/MortgageResults';
import { NovatedInputsPanel } from './components/NovatedLeaseInputs';
import { NovatedLeaseResults } from './components/NovatedLeaseResults';
import { parseUrlState, syncUrl } from './state/urlState';
import type { Mode } from './state/urlState';
import { InputsPanel } from './components/InputsPanel';
import { HeroCard } from './components/HeroCard';
import { BreakdownCard } from './components/BreakdownCard';
import { BracketsCard } from './components/BracketsCard';
import { PayslipCard } from './components/PayslipCard';
import { CompareInputsPanel } from './components/CompareInputs';
import { CompareResults } from './components/CompareResults';
import { ToggleGroup } from './components/controls';
import { ResultBar } from './components/ResultBar';
import type { ViewPeriod } from './components/view';
import { VIEW_DIVISOR, VIEW_PERIOD_LABEL } from './components/view';
import { money } from './engine/format';

const DEFAULT_FY = currentFinancialYear();

// tabs, bookmarks and history name the calculator; salary keeps index.html's title
const BASE_TITLE = document.title;
const MODE_TITLES: Record<Mode, string> = {
  salary: BASE_TITLE,
  compare: 'Contract vs permanent pay calculator – Taxman',
  mortgage: 'Mortgage repayment and stamp duty calculator – Taxman',
  novated: 'Novated lease true cost calculator – Taxman',
};

const MODE_OPTIONS: { label: string; value: Mode }[] = [
  { label: 'My salary', value: 'salary' },
  { label: 'Contract vs permanent', value: 'compare' },
  { label: 'Mortgage', value: 'mortgage' },
  { label: 'Novated lease', value: 'novated' },
];

export default function App() {
  const [{ mode, inputs, compare, mortgage, novated, fy, view }, setState] = useState(() =>
    parseUrlState(window.location.search, DEFAULT_FY),
  );

  useEffect(() => {
    syncUrl({ mode, inputs, compare, mortgage, novated, fy, view }, DEFAULT_FY);
  }, [mode, inputs, compare, mortgage, novated, fy, view]);

  useEffect(() => {
    document.title = MODE_TITLES[mode];
  }, [mode]);

  const fyData = FY_DATA[fy];
  const result = useMemo(() => calculate(inputs, fyData), [inputs, fyData]);
  const comparison = useMemo(() => compareContractPermanent(compare, fyData), [compare, fyData]);
  const mortgageResult = useMemo(() => calculateMortgage(mortgage), [mortgage]);
  const novatedResult = useMemo(() => calculateNovatedLease(novated, fyData), [novated, fyData]);

  const setInputs = (patch: Partial<CalculatorInputs>) =>
    setState((s) => ({ ...s, inputs: { ...s.inputs, ...patch } }));
  const setCompare = (patch: Partial<CompareInputs>) =>
    setState((s) => ({ ...s, compare: { ...s.compare, ...patch } }));
  const setMortgage = (patch: Partial<MortgageInputs>) =>
    setState((s) => ({ ...s, mortgage: { ...s.mortgage, ...patch } }));
  const setNovated = (patch: Partial<NovatedLeaseInputs>) =>
    setState((s) => ({ ...s, novated: { ...s.novated, ...patch } }));
  const setFy = (next: FinancialYear) => setState((s) => ({ ...s, fy: next }));
  const setView = (next: ViewPeriod) => setState((s) => ({ ...s, view: next }));
  const setMode = (next: Mode) => setState((s) => ({ ...s, mode: next }));
  // every default is what an empty URL parses to; the mode stays as it is
  const reset = () => setState((s) => ({ ...parseUrlState('', DEFAULT_FY), mode: s.mode }));

  let headline: { label: string; value: string };
  let panel: ReactNode;
  let results: ReactNode;
  switch (mode) {
    case 'novated':
      headline = {
        label: 'Implied interest rate',
        value:
          novatedResult.impliedAprPercent === null
            ? 'n/a'
            : `${novatedResult.impliedAprPercent.toFixed(2)}%`,
      };
      panel = <NovatedInputsPanel n={novated} fy={fy} onChange={setNovated} onReset={reset} />;
      results = <NovatedLeaseResults n={novated} result={novatedResult} fyData={fyData} />;
      break;
    case 'mortgage':
      headline = {
        label: `Repayments ${VIEW_PERIOD_LABEL[mortgage.frequency]}`,
        value: money(mortgageResult.initialRepayment),
      };
      panel = <MortgageInputsPanel m={mortgage} onChange={setMortgage} onReset={reset} />;
      results = <MortgageResults m={mortgage} result={mortgageResult} onChange={setMortgage} />;
      break;
    case 'compare':
      headline = {
        label: `${comparison.deltaTakeHome >= 0 ? 'Contracting' : 'Permanent'} pays more a year`,
        value: money(Math.abs(comparison.deltaTakeHome)),
      };
      panel = <CompareInputsPanel compare={compare} onChange={setCompare} onReset={reset} />;
      results = <CompareResults compare={compare} result={comparison} fyData={fyData} />;
      break;
    case 'salary':
      headline = {
        label: `Take-home ${VIEW_PERIOD_LABEL[view]}`,
        value: money(result.takeHome / VIEW_DIVISOR[view]),
      };
      panel = <InputsPanel inputs={inputs} onChange={setInputs} onReset={reset} />;
      results = (
        <>
          <HeroCard result={result} view={view} onViewChange={setView} />
          <BreakdownCard inputs={inputs} result={result} fyData={fyData} view={view} />
          <BracketsCard result={result} fyData={fyData} category={inputs.category} />
          <PayslipCard inputs={inputs} result={result} fyData={fyData} />

          <p className="caption disclaimer">
            Estimates for the {fyData.fy} financial year, assuming a full-year single job with a tax
            file number provided. Study loan and surcharge income here count salary, sacrificed
            super and any fringe benefits you enter, not investment losses. The seniors and
            pensioners tax offset is not modelled. This is general information, not financial
            advice. Sources:{' '}
            <a href={fyData.sources.brackets.url} rel="noopener">
              tax rates
            </a>
            ,{' '}
            <a href={fyData.sources.stsl.url} rel="noopener">
              study loan thresholds
            </a>
            ,{' '}
            <a href={fyData.sources.super.url} rel="noopener">
              super guarantee
            </a>
            . Found a wrong number?{' '}
            <a href="https://github.com/logan-han/taxman/issues" rel="noopener">
              Open an issue
            </a>
            .
          </p>
        </>
      );
      break;
  }

  return (
    <div className="page">
      <div className="frame">
        <header className="masthead">
          <div className="masthead__brand">
            <div className="masthead__title-row">
              <h1>Taxman</h1>
              <span className="chip-select">
                <select
                  aria-label="Financial year"
                  value={fy}
                  onChange={(e) => setFy(e.target.value as FinancialYear)}
                >
                  {FINANCIAL_YEARS.map((y) => (
                    <option key={y} value={y}>
                      FY {y}
                    </option>
                  ))}
                </select>
              </span>
            </div>
            <p className="masthead__tag">
              Australian calculators for pay, tax, mortgages and novated leases
            </p>
          </div>
          <div className="masthead__meta">
            <span className="caption">
              Calculated in your browser. Your figures never leave this page ·{' '}
              <a href="https://github.com/logan-han/taxman" rel="noopener">
                open source
              </a>{' '}
              ·{' '}
              <a href="https://han.life/coffee" target="_blank" rel="noopener">
                ☕ Buy me a coffee
              </a>
            </span>
          </div>
        </header>

        <main className="frame__main">
          <div className="mode-toggle">
            <ToggleGroup
              ariaLabel="Calculator mode"
              options={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
            />
          </div>

          <div className="layout">
            {panel}
            <div className="results">{results}</div>
          </div>
          <ResultBar key={mode} {...headline} />
        </main>
      </div>
    </div>
  );
}
