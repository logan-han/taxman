# taxman

[![codecov](https://codecov.io/gh/logan-han/taxman/graph/badge.svg)](https://codecov.io/gh/logan-han/taxman)

Ad-free Australian money calculators at [tax.han.life](https://tax.han.life). Everything runs in
your browser; nothing you type leaves the page.

- **My salary** - take-home pay, income tax, Medicare levy (with the single and family
  low-income reductions) and surcharge, HELP/HECS, super, reportable fringe benefits and
  per-payslip PAYG withholding (ATO Schedule 1), for FY 2024-25 to 2026-27
- **Contract vs permanent** - day/hourly rate vs salary, adjusted for unpaid leave and holidays
- **Mortgage** - repayments, fixed/interest-only/split loans, extra repayments, rate and growth
  forecasts, equity projection, stamp duty for all states and territories
- **Novated lease** - the true cost a quote hides: the implied interest rate solved from the
  payment/term/residual, GST on the residual payout, the luxury vehicle adjustment, RFBA
  flow-through to HELP/MLS/Div 293, EV FBT exemption phases (2026 wind-back announcement), and a
  four-way comparison against cash, a car loan and mortgage redraw (see RESEARCH-NOVATED.md)

## Develop

```
npm install
npm run dev
npm run test        # unit tests
npm run test:e2e    # Playwright, against a production build on port 4180
npm run lint
npm run typecheck
npm run format:check
npm run build
```

TypeScript + React + Vite + SCSS. No backend: every calculation runs in the browser and none of
your figures are sent anywhere. The deployed site loads Google Analytics for anonymous page-view
counts; it is skipped on localhost.

## Data updates

Adding a financial year = one new `src/data/fy*.ts` file. The Medicare low-income thresholds are
set in the following year's Budget, so a new year carries the previous figures forward until the
ATO publishes them. The **ATO Rates Watch** workflow checks the source pages weekly (plain fetch
with Chrome's request headers; ato.gov.au blocks headless browsers) and opens an issue when
anything drifts, including the Medicare thresholds and NSW's annually indexed stamp duty. It never
writes data itself. Run locally: `npx vite-node scripts/check-ato-rates.ts`.

## Deploy

GitHub Actions tests then syncs `build/` to S3 via OIDC (no stored keys) and invalidates
CloudFront. Repository settings: secrets `AWS_ROLE_ARN`, `AWS_S3_BUCKET`; variable
`CLOUDFRONT_DISTRIBUTION_ID` (optional). AWS resource details: `docs/aws-setup.md`.

## Licence

MIT. ATO material is reproduced under its copyright notice permitting copying and adaptation;
no ATO or Commonwealth endorsement implied. Estimates only, not financial advice.
