# taxman

Ad-free Australian money calculators at [tax.han.life](https://tax.han.life). Everything runs in
your browser; nothing you type leaves the page.

- **My salary** - take-home pay, income tax, Medicare levy and surcharge, HELP/HECS, super and
  per-payslip PAYG withholding (ATO Schedule 1), for FY 2024-25 to 2026-27
- **Contract vs permanent** - day/hourly rate vs salary, adjusted for unpaid leave and holidays
- **Mortgage** - repayments, fixed/interest-only/split loans, extra repayments, rate and growth
  forecasts, equity projection, stamp duty for all states and territories

## Develop

```
npm install
npm run dev
npm run test        # unit tests
npm run test:e2e    # Playwright
npm run build
```

TypeScript + React + Vite + SCSS. No backend: every calculation runs in the browser and none of
your figures are sent anywhere. The deployed site loads Google Analytics for anonymous page-view
counts; it is skipped on localhost.

## Data updates

Adding a financial year = one new `src/data/fy*.ts` file. The **ATO Rates Watch** workflow checks
the source pages weekly (plain fetch with a browser user agent; ato.gov.au blocks headless
browsers) and opens an issue when anything drifts, including NSW's annually indexed stamp duty.
It never writes data itself. Run locally: `npx vite-node scripts/check-ato-rates.ts`.

## Deploy

GitHub Actions tests then syncs `build/` to S3 via OIDC (no stored keys) and invalidates
CloudFront. Repository settings: secrets `AWS_ROLE_ARN`, `AWS_S3_BUCKET`; variable
`CLOUDFRONT_DISTRIBUTION_ID` (optional). AWS resource details: `docs/aws-setup.md`.

## Licence

MIT. ATO material is reproduced under its copyright notice permitting copying and adaptation;
no ATO or Commonwealth endorsement implied. Estimates only, not financial advice.
