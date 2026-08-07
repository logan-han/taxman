/**
 * ATO rates sentinel.
 *
 * Checks that the figures shipped in src/data still match what the ATO
 * publishes, deriving every expected string from FY_DATA rather than
 * hardcoding it. ato.gov.au blocks headless browsers (client hints betray
 * HeadlessChrome) but accepts plain HTTPS with a browser user agent, so this
 * uses bare fetch.
 *
 * It never writes data. Exit codes:
 *   0 = everything matches
 *   2 = drift: a figure changed, a new FY table appeared, or a derived figure
 *       can now be replaced with a published one
 *   3 = blocked: pages could not be fetched (bot protection / outage)
 *
 * Run: npx vite-node scripts/check-ato-rates.ts
 */
import { FY_DATA } from '../src/data';
import { STAMP_DUTY } from '../src/data/stampDuty';

const CURRENT = '2026-27' as const;
const NEXT_FY = '2027-28';
const fy = FY_DATA[CURRENT];

const dollars = (n: number) => `$${n.toLocaleString('en-AU')}`;

/** strip tags/entities, normalise whitespace and dash variants */
const norm = (s: string) =>
  s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&ndash;|&mdash;|&#8211;|&#8212;/g, '-')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const HEADERS = {
  'user-agent': UA,
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'en-AU,en;q=0.9',
};

/** snapshots older than this are treated as blocked, not checked */
const MAX_SNAPSHOT_AGE_DAYS = 90;

interface FetchedPage {
  status: number;
  text: string;
  via: 'live' | 'wayback';
  snapshotDate?: string;
}

/**
 * ato.gov.au serves 403 to datacentre IPs (e.g. CI runners) regardless of
 * user agent, so when the live fetch is refused, fall back to the newest
 * Wayback Machine snapshot. A few days' lag is fine for drift detection.
 */
async function fetchPage(url: string): Promise<FetchedPage> {
  if (process.env.ATO_SENTINEL_FORCE_WAYBACK !== '1') {
    try {
      const resp = await fetch(url, {
        headers: HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(45_000),
      });
      if (resp.status < 400) {
        return { status: resp.status, text: norm(await resp.text()), via: 'live' };
      }
    } catch {
      // fall through to wayback
    }
  }

  // CDX query scoped to the freshness window; newest snapshot via negative limit.
  // archive.org rate-limits and 503s intermittently, so space calls and retry.
  const fromDate = new Date(Date.now() - MAX_SNAPSHOT_AGE_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
  const cdxUrl =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}` +
    `&output=json&limit=-1&filter=statuscode:200&from=${fromDate}`;

  let ts: string | undefined;
  for (let attempt = 0; attempt < 3 && !ts; attempt++) {
    await new Promise((r) => setTimeout(r, attempt === 0 ? 2_000 : 10_000));
    try {
      const resp = await fetch(cdxUrl, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
      if (resp.status >= 400) continue;
      const rows = (await resp.json()) as string[][];
      if (rows.length > 1) ts = rows[rows.length - 1][1];
      else return { status: 403, text: '', via: 'wayback' }; // no fresh snapshot exists
    } catch {
      // flaky response; retry
    }
  }
  if (!ts) return { status: 403, text: '', via: 'wayback' };

  const snapDate = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 8_000));
    try {
      const snap = await fetch(`https://web.archive.org/web/${ts}/${url}`, {
        headers: HEADERS,
        redirect: 'follow',
        signal: AbortSignal.timeout(60_000),
      });
      if (snap.status >= 400) continue;
      return { status: 200, text: norm(await snap.text()), via: 'wayback', snapshotDate: snapDate };
    } catch {
      // retry
    }
  }
  return { status: 403, text: '', via: 'wayback', snapshotDate: snapDate };
}

interface PageCheck {
  name: string;
  expect: string; // human description of what we expect
  ok: (text: string) => boolean;
  drift: string; // what it means when ok() is false
}

interface SourcePage {
  url: string;
  checks: PageCheck[];
}

const stsl = fy.stsl.kind === 'marginal' ? fy.stsl : null;
const mlsTier1 = fy.mls.tiers[1];
const sgPercent = (fy.superRules.guaranteeRate * 100).toFixed(2); // "12.00"

const PAGES: SourcePage[] = [
  {
    url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents',
    checks: [
      {
        name: `resident table ${CURRENT} published`,
        expect: fy.hasDerivedFigures
          ? `not yet published (our ${CURRENT} figures are derived from legislation)`
          : `published table present`,
        ok: (t) => t.includes(`Resident tax rates ${CURRENT}`) === !fy.hasDerivedFigures,
        drift: fy.hasDerivedFigures
          ? `The ATO has published its ${CURRENT} resident table. Verify the derived brackets in src/data/fy${CURRENT}.ts against it and clear hasDerivedFigures.`
          : `The ${CURRENT} resident table disappeared from the page.`,
      },
      {
        name: 'resident 2025-26 anchor row',
        expect: '16c for each $1 over $18,200',
        ok: (t) => t.includes('16c for each $1 over $18,200'),
        drift: 'The 2025-26 resident bracket row changed or moved.',
      },
    ],
  },
  {
    url: 'https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds',
    checks: [
      ...(stsl
        ? [
            {
              name: `STSL ${CURRENT} nil threshold`,
              expect: `$0 - ${dollars(stsl.threshold)}`,
              ok: (t: string) => t.includes(`$0 - ${dollars(stsl.threshold)}`),
              drift: `The ${CURRENT} STSL nil band no longer matches threshold ${dollars(stsl.threshold)}.`,
            },
            {
              name: `STSL ${CURRENT} first marginal rate`,
              expect: `15c for each $1 over ${dollars(stsl.threshold)}`,
              ok: (t: string) => t.includes(`15c for each $1 over ${dollars(stsl.threshold)}`),
              drift: 'The first STSL marginal band changed.',
            },
          ]
        : []),
      {
        name: `STSL ${NEXT_FY} table appeared`,
        expect: 'not present yet',
        ok: (t) => !t.includes(`Table 1: ${NEXT_FY}`),
        drift: `The ATO published ${NEXT_FY} STSL thresholds - time to add src/data/fy${NEXT_FY}.ts.`,
      },
    ],
  },
  {
    url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee',
    checks: [
      {
        name: `SG rate for ${CURRENT}`,
        expect: `1 July 2026 - 30 June 2027 row showing ${sgPercent}`,
        ok: (t) => new RegExp(`1 July 2026 - 30 June 2027\\D+${sgPercent.replace('.', '\\.')}`).test(t),
        drift: `The SG percentage row for ${CURRENT} no longer shows ${sgPercent}.`,
      },
    ],
  },
  {
    url: 'https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates',
    checks: [
      {
        name: `MLS ${CURRENT} single base tier`,
        expect: `${dollars(mlsTier1.singleFrom)} or less`,
        ok: (t) => t.includes(`${dollars(mlsTier1.singleFrom)} or less`),
        drift: `The ${CURRENT} MLS base tier no longer matches ${dollars(mlsTier1.singleFrom)}.`,
      },
      {
        name: `MLS ${NEXT_FY} table appeared`,
        expect: 'not present yet',
        ok: (t) => !t.includes(`rates for ${NEXT_FY}`) && !t.includes(`rates apply for the ${NEXT_FY}`),
        drift: `The ATO published ${NEXT_FY} MLS thresholds - add them to a new FY data file.`,
      },
    ],
  },
  {
    url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps',
    checks: [
      {
        name: 'concessional cap',
        expect: `general concessional contributions cap is ${dollars(fy.superRules.concessionalCap)}`,
        ok: (t) =>
          t.includes(`general concessional contributions cap is ${dollars(fy.superRules.concessionalCap)}`),
        drift: `The concessional cap no longer reads ${dollars(fy.superRules.concessionalCap)}.`,
      },
    ],
  },
  {
    url: 'https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset',
    checks: [
      {
        name: 'LITO maximum',
        expect: `maximum offset of ${dollars(fy.lito.max)}`,
        ok: (t) => t.includes(`maximum offset of ${dollars(fy.lito.max)}`),
        drift: `LITO maximum no longer reads ${dollars(fy.lito.max)} - it has finally been changed.`,
      },
    ],
  },
  // NSW transfer duty is the one stamp duty scale indexed every July
  ...(STAMP_DUTY.NSW && STAMP_DUTY.NSW.scale.kind === 'per100'
    ? [
        {
          url: STAMP_DUTY.NSW.source.url,
          checks: [
            {
              name: 'NSW transfer duty top threshold',
              expect: dollars(STAMP_DUTY.NSW.scale.brackets[5].over),
              ok: (t: string) => t.includes(dollars(STAMP_DUTY.NSW!.scale.kind === 'per100' ? STAMP_DUTY.NSW!.scale.brackets[5].over : 0)),
              drift:
                'NSW has reindexed its transfer duty thresholds - update src/data/stampDuty.ts (and re-check the other bracket rows).',
            },
          ],
        },
      ]
    : []),
];

async function main() {
  const driftLines: string[] = [];
  const blockedLines: string[] = [];
  const okCount = { n: 0 };

  const viaNotes: string[] = [];

  for (const page of PAGES) {
    let text = '';
    try {
      const fetched = await fetchPage(page.url);
      if (fetched.status >= 400 || !fetched.text) {
        blockedLines.push(
          `- ${page.url} returned HTTP ${fetched.status}` +
            (fetched.via === 'wayback'
              ? fetched.snapshotDate
                ? ` (newest usable Wayback snapshot ${fetched.snapshotDate} is too old)`
                : ' (live blocked and no Wayback snapshot available)'
              : ''),
        );
        continue;
      }
      if (fetched.via === 'wayback') {
        viaNotes.push(`- ${page.url}: live fetch blocked, checked Wayback snapshot ${fetched.snapshotDate}`);
      }
      text = fetched.text;
    } catch (e) {
      blockedLines.push(`- ${page.url} failed: ${e instanceof Error ? e.message.split('\n')[0] : e}`);
      continue;
    }

    for (const check of page.checks) {
      if (check.ok(text)) {
        okCount.n += 1;
      } else {
        driftLines.push(`- **${check.name}** (expected: ${check.expect})\n  ${check.drift}\n  Source: ${page.url}`);
      }
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [`# ATO rates sentinel - ${today}`, ''];
  lines.push(`${okCount.n} checks passed.`);
  if (viaNotes.length) {
    lines.push('', '## Checked via Wayback Machine', '', ...viaNotes);
  }
  if (driftLines.length) {
    lines.push('', '## Drift detected', '', ...driftLines);
    lines.push(
      '',
      'Update the relevant src/data/fy*.ts file, record the checked date, and adjust the fixture tests.',
    );
  }
  if (blockedLines.length) {
    lines.push('', '## Pages that could not be checked', '', ...blockedLines);
    lines.push('', 'If this persists, the runner IPs are being blocked - check these pages manually.');
  }

  const report = lines.join('\n');
  console.log(report);

  if (driftLines.length) process.exit(2);
  if (blockedLines.length) process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(3);
});
