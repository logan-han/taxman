import { useEffect, useMemo, useState } from 'react';
import { FY_DATA, FINANCIAL_YEARS, currentFinancialYear } from './data';
import type { FinancialYear } from './data';
import { calculate, DEFAULT_INPUTS } from './engine/calculate';
import type { CalculatorInputs } from './engine/calculate';
import { compareContractPermanent, DEFAULT_COMPARE } from './engine/compare';
import type { CompareInputs } from './engine/compare';
import { calculateMortgage, defaultMortgage } from './engine/mortgage';
import type { MortgageInputs } from './engine/mortgage';
import { calculateNovatedLease, defaultNovated } from './engine/novatedLease';
import type { NovatedLeaseInputs } from './engine/novatedLease';
import { MortgageInputsPanel } from './components/MortgageInputs';
import { MortgageResults } from './components/MortgageResults';
import { NovatedInputsPanel } from './components/NovatedLeaseInputs';
import { NovatedLeaseResults } from './components/NovatedLeaseResults';
import { parseUrlState, syncUrl, DEFAULT_VIEW } from './state/urlState';
import type { Mode } from './state/urlState';
import { InputsPanel } from './components/InputsPanel';
import { HeroCard } from './components/HeroCard';
import { BreakdownCard } from './components/BreakdownCard';
import { BracketsCard } from './components/BracketsCard';
import { PayslipCard } from './components/PayslipCard';
import { CompareInputsPanel } from './components/CompareInputs';
import { CompareResults } from './components/CompareResults';
import { ToggleGroup } from './components/controls';
import type { ViewPeriod } from './components/view';

const DEFAULT_FY = currentFinancialYear();

export default function App() {
  const [{ mode, inputs, compare, mortgage, novated, fy, view }, setState] = useState(() =>
    parseUrlState(window.location.search, DEFAULT_FY),
  );

  useEffect(() => {
    syncUrl({ mode, inputs, compare, mortgage, novated, fy, view }, DEFAULT_FY);
  }, [mode, inputs, compare, mortgage, novated, fy, view]);

  const fyData = FY_DATA[fy];
  const result = useMemo(() => calculate(inputs, fyData), [inputs, fyData]);
  const comparison = useMemo(
    () => compareContractPermanent(compare, fyData),
    [compare, fyData],
  );
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
  const reset = () =>
    setState((s) => ({
      mode: s.mode,
      inputs: DEFAULT_INPUTS,
      compare: DEFAULT_COMPARE,
      mortgage: defaultMortgage(new Date().getFullYear()),
      novated: defaultNovated(new Date()),
      fy: DEFAULT_FY,
      view: DEFAULT_VIEW,
    }));

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
              <a href="https://coffee.han.life" target="_blank" rel="noopener">
                ☕ Buy me a coffee
              </a>
            </span>
          </div>
        </header>

        <div className="mode-toggle">
          <ToggleGroup
            ariaLabel="Calculator mode"
            options={[
              { label: 'My salary', value: 'salary' as Mode },
              { label: 'Contract vs permanent', value: 'compare' as Mode },
              { label: 'Mortgage', value: 'mortgage' as Mode },
              { label: 'Novated lease', value: 'novated' as Mode },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        {mode === 'novated' ? (
          <div className="layout">
            <NovatedInputsPanel n={novated} fy={fy} onChange={setNovated} onReset={reset} />
            <div className="results">
              <NovatedLeaseResults n={novated} result={novatedResult} fyData={fyData} />
            </div>
          </div>
        ) : mode === 'mortgage' ? (
          <div className="layout">
            <MortgageInputsPanel m={mortgage} onChange={setMortgage} onReset={reset} />
            <div className="results">
              <MortgageResults m={mortgage} result={mortgageResult} onChange={setMortgage} />
            </div>
          </div>
        ) : mode === 'compare' ? (
          <div className="layout">
            <CompareInputsPanel compare={compare} onChange={setCompare} onReset={reset} />
            <div className="results">
              <CompareResults compare={compare} result={comparison} fyData={fyData} />
            </div>
          </div>
        ) : (
        <div className="layout">
          <InputsPanel inputs={inputs} fy={fy} onChange={setInputs} onReset={reset} />

          <div className="results">
            <HeroCard result={result} view={view} onViewChange={setView} />
            <BreakdownCard inputs={inputs} result={result} fyData={fyData} view={view} />
            <BracketsCard result={result} fyData={fyData} category={inputs.category} />
            <PayslipCard inputs={inputs} result={result} fyData={fyData} />

            <p className="caption disclaimer">
              Estimates for the {fyData.fy} financial year, assuming a full-year single job with
              a tax file number provided. Study loan and surcharge income here include salary and
              sacrificed super only; fringe benefits and investment losses would raise them.
              Medicare levy family reductions and SAPTO are not modelled. This is general
              information, not financial advice. Sources:{' '}
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
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
