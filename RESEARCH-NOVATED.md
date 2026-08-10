# Novated lease calculator: research and design

Date: 10 August 2026. Companion to RESEARCH.md (6 Aug 2026), same conventions: every figure carries a source URL and a checked date, correctness traps are listed before design, golden fixtures are derived from primary evidence. All statute references checked against announcement or ATO pages on 10 Aug 2026.

## 1. Verdict

Build a fourth mode, "Novated lease", whose job is the opposite of every provider calculator: expose the true cost. Provider quotes are deliberately opaque. The sample quote studied here (Maxxia, July 2026, 2026 Volvo EX60 Ultra P6 Electric) shows no interest rate, no amount financed, no residual GST, no luxury vehicle adjustment, no reportable-fringe-benefit consequences, and a headline "tax savings" figure that cannot be reconstructed from the quote's own line items. An independent review of 20 provider calculators found 18 show only a "tax saving", most hide the interest rate, and 5 are lead-capture funnels (novatedlease.guide/start-here/calculator-comparison/, checked 10 Aug 2026).

The differentiators, in priority order:

1. **Implied APR solver.** User types the four numbers every quote does show (amount financed or car price, fortnightly finance payment, term, residual) and gets the effective interest rate, graded against market. No other mainstream calculator does this; leasecheck.au does and grades <10% competitive, 10-13.99% elevated, >=14% high.
2. **Lease-to-own total.** All payments + residual + GST on the residual, stated plainly.
3. **Four-scenario comparison** on identical assumptions: novated lease vs cash vs car loan vs mortgage redraw/offset, with opportunity cost and end-of-term net position.
4. **The downstream effects quotes never mention:** RFBA raising HELP repayments, Medicare levy surcharge income, Div 293, child support and family assistance; the luxury vehicle adjustment; the EV FBT phase-out timeline.

This fills the known gap vs paycalculator.com.au noted in RESEARCH.md section 2 (its novated module handles EV FBT), and does so with the repo's existing edge: traceable sources, URL state, no ads, everything in-browser.

## 2. The sample quote, dissected (golden fixture A)

Maxxia quote 1429840 (22 Jul 2026): 2026 Volvo EX60 Ultra P6 Electric, fully maintained novated lease, 5 years (130 fortnights).

| Quote line | Value |
|---|---|
| "Maxxia price" | $90,417 |
| GST savings on car | $6,353 |
| Residual value | $27,978 |
| Finance per fortnight | $883.11 |
| Running costs per fortnight (rego 32.11 + servicing 28.25 + tyres 6.60 + charging 28.69 + insurance 96.05) | $191.70 |
| Total package per fortnight | $1,074.81 |
| "Out of pocket" per fortnight | $757 |
| "Life of lease tax savings" | $59,105 |

What the quote does not say, reconstructed:

- **GST saving = the FY2026-27 statutory cap exactly.** $6,353 = 1/11 of the $69,883 car limit. This dates the quote's rule set and confirms the financed amount is approximately price minus capped GST credit: about $84,064, plus whatever on-roads and fees were rolled in (not disclosed).
- **Implied APR: 12.8% to 19.4%.** Solving RATE(130, -883.11, financed, -27978) x 26: financed $84,064 gives 19.36% nominal (21.3% effective annual); $90,417 gives 16.45%; only if the financed amount were $99,460 (price plus ~$9k of on-roads and fees, which would put the residual at exactly the ATO 5-year minimum of 28.13%) does it fall to 12.79%. Even the most charitable reading is roughly double a 2026 secured car loan (average ~7.5%, best green loans ~5.5%). Market novated finance typically runs 8-12%; this quote is above even that band on any plausible financed amount.
- **Total finance payments: $114,804** (883.11 x 130) **+ residual $27,978 + GST on residual $2,798 = $145,580 to own a $90,417 car**, before any tax effect. Interest and embedded fees: $52k-59k depending on financed amount.
- **Residual is set $4,331 above the ATO minimum** (33.28% of $84,064 vs the 28.13% floor = $23,647). Higher residual lowers the fortnightly (making the quote look better) and inflates the balloon, which the provider then offers to insure via the "guaranteed buy back" upsell.
- **Luxury vehicle adjustment: invisible.** Price exceeds the $69,883 car limit, so Div 242 denies the employer full rental deductions and providers routinely pass this back through the package. SG Fleet's published formula gives ~$811/yr (~$4,055 over term) on these numbers at 30% employer tax. The quote shows no such line; it is either inside "Finance" or will appear in the final package.
- **RFBA: ~$34,120/yr.** Notional taxable value 20% x $90,417 = $18,083, grossed up at 1.8868. Exceeds the $27,945/yr pre-tax deduction by $6,175, so **anyone with a HELP debt pays MORE HELP with this lease than without it**: +$926/yr at $100k-$120k salary, +$1,050/yr at $150k (FY2026-27 marginal HELP rules). Also raises MLS income, Div 293 income, child support income and reduces family assistance. Nowhere in the quote.
- **The headline "$59,105 tax savings" cannot be reconciled.** The quote's own fortnightly numbers imply (1,074.81 - 757) x 130 = $41,315. Adding the full GST saving on the car ($6,353) and GST on running costs (~$2,266) reaches $49,934, still $9,171 short. No single marginal tax rate makes the two headlines consistent; the income assumption is undisclosed.

These reconstructions become unit-test golden fixtures (section 7).

### 2b. Second sample quote (golden fixture B): Flare Cars 247963, 22 Jul 2026

An indicative-EV quote from Flare, added 10 Aug 2026, notable for how much more it discloses
than fixture A, which makes it a cross-validation of the model against a provider's own
arithmetic:

| Quote line | Value |
|---|---|
| Total on-road price | $90,843.20 |
| "Vehicle cost" (amount financed, disclosed) | $84,490.20 |
| FBT base value (disclosed: drive-away less government on-roads) | $85,600.00 |
| Finance per fortnight (ex GST) | $697.21 |
| Running budget incl $11.54 management fee (ex GST) | $183.16 |
| Input tax credit per fortnight (disclosed) | $88.04 |
| Residual, printed inc GST | $26,143.80 ($23,767.09 + $2,376.71 GST) |
| Salary / term | $180,000 / 60 months |
| Net impact to take-home pay | $536.37/fn |

Validations:

- Disclosed financed amount = price minus the $6,353 capped GST credit exactly, confirming the
  model's estimation formula for quotes that hide it.
- Residual set at exactly the ATO 5-year floor (28.13% of financed) and printed inc GST,
  confirming both the minimum-residual default and the inc/exc GST toggle.
- Implied rate solves to **10.50%** (financed 84,490.20, 130 x 697.21, residual 23,767.09
  ex GST): inside the typical band, versus fixture A's 12.8-19.4% opacity range.
- The engine reproduces Flare's own $536.37/fn net impact within 66c (their PAYG rounding),
  and their savings headline reconciles ($44,720 tax = 39% marginal x package; $11,444.81 GST
  = ITC x 130; + $6,353 GST on purchase) - unlike fixture A's irreconcilable $59,105.
- What even this transparent quote omits: RFBA consequences (at $180k the $32,302 RFBA sets
  MLS tier 3 income without hospital cover, and sits $16k short of the Div 293 threshold) and
  any luxury vehicle adjustment line despite the financed amount exceeding the car limit,
  further evidence that LVA pass-through varies by provider/employer (section 3.4 flag).
- FBT base value disclosure ($85,600 vs $90,843 drive-away) shifts RFBA by ~$2k/yr, which is
  why the calculator carries an optional base-value input rather than always using the price.

## 3. Verified rules data

### 3.1 EV FBT exemption and the 5 May 2026 phase-out (announcement stage)

Electric Car Discount (Treasury Laws Amendment (Electric Car Discount) Act 2022): FBT exemption for BEV/FCEV cars first held and used on or after 1 Jul 2022, below the fuel-efficient LCT threshold at first retail sale, <1 tonne, <9 passengers. PHEVs excluded from 1 Apr 2025 for new arrangements (pre-existing financially binding commitments grandfathered; any change ends it).
https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/fringe-benefits-tax/types-of-fringe-benefits/fbt-on-cars-other-vehicles-parking-and-tolls/electric-cars-exemption (checked 10 Aug 2026)

Statutory review final report released 5 May 2026 (cost $2.0bn 2022-25, ~$1.35bn in 2025-26 alone; ~64k additional BEV sales). Same day, Treasurer and Minister Bowen announced the phase-out, booked in Budget 2026-27 ($1.7bn saved over five years):

| Phase | Window (FBT years) | Treatment for eligible BEV/FCEV under the FE LCT threshold |
|---|---|---|
| 1 | to 31 Mar 2027 | Full exemption (status quo) |
| 2 | 1 Apr 2027 - 31 Mar 2029 | Full exemption only if value <= $75,000; above $75k: 25% discount on FBT otherwise payable |
| 3 | from 1 Apr 2029 | Exemption abolished; 25% discount for all eligible EVs |

The 25% discount = taxable value reduced 25%, i.e. an effective 15% statutory rate (worked example: $80,000 EV, FBT ~= 80,000 x 20% x 75% x 2.0802 x 47% ~= $11,700/yr).
**Existing leases are grandfathered for their term**; materially altering the arrangement (extension, refinance, new employer) risks the new rules. **Not yet legislated as at 10 Aug 2026** (no bill or exposure draft; ATO lists it as announced new legislation). The $75,000 measurement basis is undefined in public sources (likely FBT base value; flag in UI).
https://ministers.treasury.gov.au/ministers/jim-chalmers-2022/media-releases/fairer-tax-treatment-encourage-affordable-evs
https://www.pwc.com.au/tax/tax-alerts/government-announces-phased-changes-to-the-FBT-electric-car-exemption.html
https://www.bdo.com.au/en-au/insights/budget/2026/farewell-to-the-full-fbt-exemption-on-evs (all checked 10 Aug 2026)

**Consequence for the sample quote:** the EX60 at $90,417 is under the $91,661 FE LCT threshold but over $75,000. Commencing before 31 Mar 2027 locks in full exemption for the 5-year term. The same lease commencing 1 Apr 2027 would attract the 25%-discounted FBT (or ECM contributions of ~15% of base value, ~$13.6k/yr post-tax) for its whole term. The calculator must take a commencement date.

### 3.2 Thresholds

| Figure | FY2025-26 | FY2026-27 | Source |
|---|---|---|---|
| LCT threshold, fuel-efficient | $91,387 | $91,661 | ato.gov.au/tax-rates-and-codes/luxury-car-tax-rate-and-thresholds (checked 10 Aug 2026) |
| LCT threshold, other | $80,567 | $80,809 | same |
| Car cost limit (Div 40/Div 242) | $69,674 | $69,883 | ato.gov.au small business newsroom "Car thresholds from 1 July" (checked 10 Aug 2026) |
| Max GST input credit on car (1/11 of limit) | $6,334 | $6,353 | same |

From 1 Jul 2025 "fuel-efficient" tightened to <=3.5L/100km (irrelevant to BEVs, fatal to most PHEVs). FBT rate 47%; statutory formula 20% of base value; gross-up type 1 (GST-creditable) 2.0802, type 2 1.8868; FBT year 1 Apr - 31 Mar (misaligned with FY: keep FBT data in its own module).

### 3.3 Residuals

ATO minimum residuals (IT 28 lineage, TD 93/142 formula, ATO ID 2002/1004 for 8-year-life cars): 75% - (75%/8 x term) of cost. Industry applies the percentage to the amount financed (ex GST):

| Term | 1yr | 2yr | 3yr | 4yr | 5yr |
|---|---|---|---|---|---|
| Minimum residual | 65.63% | 56.25% | 46.88% | 37.50% | 28.13% |

The residual is **ex-GST; buying the car at end adds 10% GST** on top (the lessor's sale is a taxable supply). The residual cannot be salary packaged. Selling above residual: excess is the employee's, tax free. Re-leasing refinances the residual and resets the interest cycle. Km-banded residual matrices seen in the wild are financier practice layered on the minimums, not ATO rules.
https://www.ato.gov.au/law/view/document?docid=aid/aid20021004/00001 (403 to robots; corroborated by multiple secondary sources, checked 10 Aug 2026)

### 3.4 Package mechanics

- **Exempt EV:** 100% of finance + running costs pre-tax; employer claims GST credits on running costs (employee effectively pays them ex-GST from pre-tax dollars); GST on purchase saved up to the cap. RFBA still reportable (section 3.5).
- **Non-exempt (ICE, PHEV from Apr 2025, EVs post-phase):** statutory taxable value = 20% x base value (base value = GST-inclusive cost including dealer delivery and non-business accessories, excluding rego, CTP and stamp duty; reduced by 1/3 after 4 full FBT years). ECM: post-tax contributions reduce taxable value dollar for dollar; contributing exactly 20% (or 15% under the 25% discount) of base value per FBT year zeroes FBT. Employer remits 1/11 of employee contributions as GST (GSTR 2001/3), passed back into the package.
- **Amount financed** = drive-away price (incl on-roads) - GST credit (capped) + establishment fee + anything else rolled in (first-year insurance, gap insurance, accessories, brokerage). Documented real-world extras: $440 establishment, $170/yr admin, $15-24/mo management, fortnightly "brokerage" lines, and one case of ~$8k undisclosed financed brokerage.
- **Luxury vehicle adjustment (Div 242),** applies whenever the car's value exceeds the car limit ($69,883), including FBT-exempt EVs. SG Fleet's published formula: NCCP = AF - RV; deemed proceeds = RV x carLimit/AF; allowable dep = carLimit - deemed proceeds; LVA/yr = (NCCP - allowable dep) x t/(1-t) / term, with t = employer tax rate 30%. Sample quote: ~$811/yr. Some employers waive or absorb it: model it by default above the car limit with an override toggle.
https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf (checked 10 Aug 2026)
- **Job change/redundancy:** novation dissolves; lease reverts to the employee personally, budgets stop, early payout = remaining rentals + residual + fees. Not a calculation, but belongs in the UI as a risk note.

### 3.5 RFBA and its blast radius

Exempt-EV benefits are excluded from FBT but the notional taxable value must still be reported as RFBA where total benefits exceed $2,000 taxable value. RFBA always uses the type 2 gross-up 1.8868 regardless of GST status. RFBA counts toward: HELP/STSL repayment income, Medicare levy surcharge income, Div 293 income ($250k), child support adjusted taxable income, family assistance/FTB and childcare subsidy income.
https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/reportable-fringe-benefits-for-employees/consequences-of-having-a-reportable-fringe-benefits-amount (checked 10 Aug 2026)

FY2026-27 HELP (already in src/data/fy2026-27.ts): nil to $69,528; 15c/$ from $69,529 to $129,717; then $9,028 + 17c/$; capped at 10% of repayment income. Because RFBA (1.8868 x 20% x base value ~= 37.7% of base value) usually exceeds the annual pre-tax lease deduction, **a novated EV typically increases HELP repayments**. Golden fixture: sample quote at $100k salary, +$926/yr.

### 3.6 Market rates snapshot (defaults, user-editable; refresh periodically, not ATO facts)

August 2026: RBA cash rate 4.35% (2025 cuts reversed by three 2026 hikes). Variable owner-occupier mortgages: best ~5.69%, big-four advertised ~5.99-6.23%. Secured new car loans: best green/EV ~5.54-5.67%, market average ~7.3-7.5% (RBA prime-borrower 7.48%). Novated finance: typically 8-12% effective; competitive ~6.5-7.5%. Proposed engine defaults: mortgage/offset 5.9%, car loan 7.0%, novated implied from quote. No national EV road user charge exists or is scheduled (deferred from Budget 2026-27); NSW's legislated 2.974c/km BEV charge from 1 Jul 2027 (or 30% EV share) is constitutionally doubtful post-Vanderstock; exclude RUC from the model, note it in UI copy.

## 4. Correctness traps (the do-not-screw-up list)

1. **RFBA must raise STSL and MLS income even though it is not taxable income.** The existing `deductions` input deliberately does not feed `repaymentIncome` (calculate.ts:282); a novated lease needs a new `reportableFringeBenefits` input that adds to STSL repayment income, MLS income and Div 293 income but not taxable income. This is the one real engine change; everything else composes.
2. **The pre-tax deduction reduces taxable income AND SG base questions.** Salary sacrifice to a lease does not reduce SG under s15A-compliant employers (SG is on OTE base incl sacrificed amounts since 2020). Do not model an SG cut. (Same class of trap as RESEARCH.md's "sacrifice must not reduce STSL".)
3. **GST on the residual.** Lease-to-own totals must include residual x 1.1. Presentation varies between providers (some print residual inc GST); make the input explicit ("residual as shown; is GST included?").
4. **Financed amount != car price.** GST credit is capped at 1/11 of the car limit, not 1/11 of price; on-roads and fees get rolled in. When the user knows only the price, present the implied APR as a range across financed-amount assumptions, stating them.
5. **FBT year (Apr-Mar) is not the financial year.** Phase boundaries are 31 Mar 2027 / 31 Mar 2029. ECM contributions are per FBT year. Keep FBT facts in a standalone cross-year module (like stampDuty.ts), keyed by date, not FY.
6. **Grandfathering is by commencement, for the lease term.** A 5-year lease starting Mar 2027 is fully exempt to 2032; the identical lease starting Apr 2027 is not exempt at all (>$75k) bar the 25% discount. Re-lease/extension = new arrangement under then-current rules.
7. **The $75k Phase 2 cap and the FE LCT threshold are different tests on (probably) different bases**, and the phase-out is announcement-stage law. Show an "announced, not yet legislated" badge sourced to the ATO new-legislation page.
8. **LVA applies to FBT-exempt EVs** over the car limit. FBT exemption and Div 242 are independent regimes.
9. **ECM contributions attract GST** (employer remits 1/11), typically passed back into the package: post-tax contribution needed = 20% (or 15%) of base value, and the package cost includes the GST on it.
10. **Base value excludes rego/CTP/stamp duty but includes dealer delivery and accessories**; after 4 full FBT years it drops by one third (matters for term >4yrs ECM splits).
11. **Provider "tax savings" headlines use a padded post-tax baseline** (same inflated finance rate and budgets paid post-tax). Never reproduce that framing; compare against realistic alternatives.
12. **Residuals above the ATO minimum are common** (sample: 33.28% vs 28.13% floor): lower fortnightly, bigger balloon, more interest. Show the minimum alongside the quoted residual.
13. **Running-cost budgets are estimates, not costs.** Surpluses are eventually returned via payroll as taxed salary (i.e. the "pre-tax" benefit on unspent budget unwinds). Default the comparison to actual expected running costs, not the quote's budget.
14. **PHEVs are dead for new leases** since 1 Apr 2025, so the UI folds PHEV into the petrol/diesel option: a new PHEV lease is taxed identically to petrol. The only exception, a pre-Apr-2025 financially binding commitment still running, can be modelled by selecting EV; changing it (new lease, refinance, new employer) ends the exemption.

## 5. Comparison methodology

Same car, same realistic running costs, same horizon (the lease term), in all four scenarios. Running costs (rego, insurance, servicing, tyres, energy/fuel) are common to every scenario except for the lease's GST-free, pre-tax treatment of them, so the deltas isolate financing + tax treatment.

| Scenario | Cash outflows | End-of-term position |
|---|---|---|
| Novated lease | Package deductions (pre-tax; post-tax ECM where applicable) + LVA + downstream tax effects (HELP/MLS/Div 293 deltas) | Owns car after paying residual + GST; or walks away |
| Cash | Price upfront + running costs (post-tax dollars, GST inclusive) | Owns car; lost offset interest on cash (opportunity cost at offset rate, compounding fortnightly) |
| Car loan | Deposit (optional) + repayments at user rate (default 7.0%) + running costs | Owns car |
| Mortgage redraw/offset | Price drawn at mortgage rate (default 5.9%); repay over the term for a fair comparison, with a toggle to show "minimum repayments over remaining mortgage life" and its much larger true interest | Owns car; redraw balance restored by term end (in the fair-comparison mode) |

Outputs per scenario: nominal total outlay over term, end-of-term net position (car market value estimate minus any liability), and net cost = outlay - end value. Winner = lowest net cost; show deltas vs the lease. Present both nominal and discounted (at the offset rate) totals; nominal is the headline (matches how people read quotes), discounting available under an "advanced" disclosure. Car market value at term end defaults to the quoted residual (conservative, and self-consistent: if the market value were below residual, the lease walk-away option would win; note this asymmetry in copy as the one genuine lease option value).

Tax savings shown for the lease are computed from the user's actual salary via the existing engine (two `calculate()` runs, the compare.ts `sideFor()` idiom): baseline vs (salary - pre-tax deductions, + RFBA on repayment/MLS/Div 293 income). That automatically captures bracket boundaries, LITO, Medicare, MLS tier jumps, HELP marginal rates and Div 293, which no flat "marginal rate x package" shortcut gets right (emumoney's method).

## 6. Feature design

Follows the mortgage-mode pattern exactly (see RESEARCH.md section 6, Explore notes):

- **`src/data/fbt.ts`** (cross-year module like stampDuty.ts, with `source: {url, checked}` per block): FBT rate/gross-ups/statutory fraction; EV exemption phases as dated rules `{from: '2022-07-01', fullExemptionCap: 'lct-fe'} / {from: '2027-04-01', fullExemptionCap: 75000, discount: 0.25} / {from: '2029-04-01', fullExemptionCap: 0, discount: 0.25}`; car limits, GST caps and LCT FE thresholds by FY; ATO minimum residual table; `legislated: false` flag on the phase rules to drive the UI badge.
- **`src/engine/novatedLease.ts`**: pure functions.
  - `impliedRate(financed, paymentPerPeriod, periodsPerYear, n, residual)` via bisection (reuse the approach of `amortisedRepayment`, which needs a residual/FV term added or a sibling function).
  - `evFbtTreatment(vehicleType, baseValue, commencementDate)` -> `{exempt | discounted | full}` + ECM split.
  - `leaseCashflows(inputs)` -> per-year pre-tax/post-tax deductions, LVA, RFBA.
  - `calculateNovated(inputs, salaryInputs, fyData)` -> runs `calculate()` twice, returns scenario table + implied APR + lease-to-own totals + downstream deltas (HELP/MLS/Div 293 with/without).
  - Scenario functions for cash/loan/redraw reusing `amortisedRepayment`.
- **Engine change in `calculate.ts`**: optional `reportableFringeBenefits` on `CalculatorInputs`, added to `repaymentIncome`, MLS income and Div 293 income only. Unit tests to pin that it never touches taxable income.
- **`src/state/urlState.ts`**: `Mode` gains `'novated'`; params prefixed `n` (np price, nf financed, nr residual, npm payment, nt term, nv vehicle type, nd start date, salary params shared with salary mode).
- **UI**: `NovatedLeaseInputs.tsx` (quote-entry panel mirroring the quote's own field names, so users can transcribe line by line) + `NovatedLeaseResults.tsx`: hero card = implied APR with grade band; cards for lease-to-own total, four-scenario comparison table with verdict (reuse `.tbl`, `verdict` testid convention), downstream effects card (HELP/MLS/RFBA), assumptions card with AtoLink provenance and the "announced, not yet legislated" badge. Fortnightly/annual toggle via existing `ViewPeriod`.
- **Copy rules**: never render the word "savings" without stating the baseline; always show residual inc GST alongside ex GST; job-loss risk note; PHEV date logic explained inline.

## 7. Testing plan

Unit (vitest, co-located, golden fixtures in comments citing this document):

- Implied APR fixture A (Maxxia quote): financed 84,064, pmt 883.11, n 130, fv 27,978 -> 19.36% nominal +-0.02; financed 99,460 -> 12.79%.
- Lease-to-own fixture A: $145,580 (incl $2,798 residual GST).
- LVA fixture A: $811/yr (SG Fleet formula, t=0.30, term 5).
- RFBA fixture A: 20% x 90,417 x 1.8868 = $34,120; HELP delta at $100k salary FY2026-27 = +$926/yr (trap test: lease increases HELP).
- Residual minimums table; boundary: 5yr min 28.13% of financed.
- Phase boundary tests: commencement 2027-03-31 (exempt, term-long) vs 2027-04-01 at $76k base (25% discount) vs $75k (exempt); 2029-04-01 (discount only); PHEV commencement 2025-04-01 (not exempt).
- reportableFringeBenefits raises repaymentIncome and MLS income, never taxableIncome (regression trap).
- ECM: GST on employee contributions included in package cost; 1/3 base value reduction after 4 FBT years.

E2E (playwright, follow calculator.spec.ts pattern): default renders; transcribing fixture A produces the implied-APR grade and lands in URL; shared URL restores; verdict flips when car-loan rate input drops below breakeven.

## 8. Prior art

- **emumoney.com.au novated calculator** (the one to beat): inputs salary/price/term/running costs/manual rate; tax saving = package x marginal rate. No APR extraction (you must already know the rate, which is the whole problem), no FBT/ECM or EV-vs-ICE logic, no GST on residual, no alternatives comparison, no RFBA/HELP/MLS, price capped at $150k, provider framing ("tax saving" headline). Its only virtues: shows the ATO minimum residual and a payslip view.
- **novatedlease.guide/calculator** (independent, best methodology found): 4 scenarios incl keep-current-car, offset-based opportunity cost, effective-rate display, 2026 phase rules, RFBA flow-through. Validates the approach; not open source, no URL state, not integrated with a full tax engine.
- **leasecheck.au**: quote upload + implied rate grading (<10 / 10-13.99 / >=14). Validates the APR-grading UX.
- taxman's edge over all three: full ATO-grade tax engine underneath (marginal HELP, MLS tiers, Div 293, LITO), per-figure provenance links, URL-shareable state, no lead capture.

## 9. Maintenance calendar additions

- 1 July annually: car cost limit, GST credit cap, LCT thresholds (indexation) -> fbt.ts; refresh market-rate defaults.
- Watch: passage of the EV phase-out legislation (flip `legislated: true`, re-verify the $75k basis and 25% mechanics from the bill's EM); ATO new-legislation page is the sentinel target.
- 31 Mar 2027 / 31 Mar 2029: phase boundaries take effect (data already encoded; verify no drift).
- Monitor national RUC developments (excluded from model; copy mentions it).
- Add the new ATO source pages to scripts/check-ato-rates.ts.

## 10. Open items and unverified flags

- Phase-out is **announcement-stage**: no bill as at 10 Aug 2026. The $75,000 valuation basis (FBT base value vs drive-away) is undefined publicly. UI must badge this; data module carries `legislated: false`.
- The "3-4% upfront finance commission" often claimed for novated brokers is folklore: no public disclosure verifies a number. Do not print it; say "commissions are embedded and undisclosed" (Maxxia's own disclaimer admits commissions exist).
- Maxxia's financed amount for fixture A is inferred, not disclosed; the implied-APR range presentation (12.8-19.4%) is the honest treatment.
- MLS FY2026-27 thresholds in the repo derive from calculator-site corroboration, not yet ATO-published pages (existing RESEARCH.md open item; unchanged).
- 1/3 base-value reduction after 4 FBT years and taxed return of budget surpluses: standard rules, not re-verified against primary sources this pass.
- NSW RUC from 1 Jul 2027: legislated but constitutionally doubtful (Vanderstock); excluded.

## 11. Sources

Primary: ato.gov.au (electric cars exemption; PHEV page; car thresholds from 1 July; LCT rate and thresholds; FBT rates and thresholds; RFBA consequences; study loan rates; new-legislation tracker), ministers.treasury.gov.au and minister.dcceew.gov.au (5 May 2026 joint release), treasury.gov.au (EDC review terms of reference and final report p2026-766052), legislation.gov.au C2022A00086, GSTR 2001/3, ATO ID 2002/1004, TD 93/142, SG Fleet LVA guide PDF (V202409), budget.gov.au 2026-27.
Secondary (cross-checks): PwC, BDO, BlueRock, Accounting Times, Investax, The Driven (5 May 2026 and 12 May 2026), CarExpert (RUC deferral), zecar, novatedlease.guide (calculator methodology, 20-calculator review, rate/residual explainers), leasecheck.au, Clear Lease, Easi, Leaselab, Veercal, RemServ, Maxxia FAQ, FleetPartners/Fleetcare/StreetFleet (termination), Whirlpool 2621053 and 1960330 (real quotes, RATE method), Finder/Canstar/money.com.au (Aug 2026 rates), Gridly, SkipTheDealer, mlscalculator.com.au.
Full URL list preserved in the research transcripts of 10 Aug 2026; every load-bearing figure above names its source inline.
