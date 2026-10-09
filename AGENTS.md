# AGENTS.md

Notes for coding agents working on taxman. User-facing overview: README.md.

## Checks

CI runs all of these; run them before pushing:

```
npm run lint && npm run typecheck && npm run format:check
npm run test -- --coverage
npm run test:e2e -- --project=chromium
npm run build
```

- `vite build` only transpiles; `npm run typecheck` is what catches type errors, including in
  `e2e/`, `scripts/` and the config files (`tsconfig.node.json`).
- e2e builds and previews on port 4180. Vite's default 4173 is shared with other local projects,
  and Playwright reuses whatever server answers there.
- jsdom has no `PointerEvent`; `vitest.setup.ts` shims it so `fireEvent.pointer*` keeps
  `clientX` and `pointerType`.
- Pushing to `main` deploys to production (tax.han.life).
- React is held on 19.2 (`~` ranges): 19.3 adds about 9 KB gzip (ViewTransition, Fragment refs)
  that this app doesn't use, about 10% of the bundle.

## Layout

- `src/data/` - rates per financial year (`fy*.ts`), stamp duty, FBT and car thresholds.
- `src/engine/` - pure calculations, no React: `calculate.ts` (annual tax), `withholding.ts`
  (Schedule 1 per-pay), `compare.ts`, `mortgage.ts`, `novatedLease.ts`.
- `src/components/` - UI. Dollar fields use `AmountInput` from `controls.tsx`, which keeps the
  typed text so cents survive keystroke by keystroke.
- `src/state/urlState.ts` - the URL is the state container. Every input needs a param in both
  `parseUrlState` and `serialiseUrlState`, defaults omitted, plus the round-trip test.

## Rates and rules

- Every figure needs its source URL and a checked date in the FY file's `sources` map. Derived or
  carried-forward figures say so in a note (and in `hasDerivedFigures` for brackets).
- ato.gov.au's bot protection refuses plain fetches; send Chrome's full header set, as
  `scripts/check-ato-rates.ts` does.
- Engine changes need a test that shows the arithmetic, ideally an ATO worked example.
- Medicare levy: s 7 (single shade-in) then s 8 (family threshold, reduction shared with a
  spouse who also pays) of the Medicare Levy Act 1986; the half exemption halves the result.
- Australian English in UI copy.
