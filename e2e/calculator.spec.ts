import { test, expect } from '@playwright/test';

test.describe('taxman calculator', () => {
  test('default $100,000 shows the verified FY2026-27 figures', async ({ page }) => {
    await page.goto('/');
    // default view is monthly: 77,480 / 12
    await expect(page.getByTestId('take-home')).toHaveText('$6,457');
    await expect(page.getByTestId('take-home-annual')).toHaveText('$77,480');
    await expect(page.getByTestId('income-tax')).toHaveText('−$20,520');
    await expect(page.getByTestId('medicare')).toHaveText('−$2,000');
    await expect(page.getByTestId('super')).toHaveText('+$12,000');
    await expect(page.getByTestId('withheld-weekly')).toHaveText('−$434');
  });

  test('view toggle switches periods and lands in the URL', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Annually' }).click();
    await expect(page.getByTestId('take-home')).toHaveText('$77,480');
    await expect(page).toHaveURL(/v=annually/);
    await page.getByRole('button', { name: 'Weekly' }).click();
    await expect(page.getByTestId('take-home')).toHaveText('$1,490');
  });

  test('study loan toggle adds the $4,571 repayment', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Study loan').check();
    await expect(page.getByTestId('stsl')).toHaveText('−$4,571');
    await expect(page).toHaveURL(/sl=1/);
  });

  test('salary sacrifice reduces tax but not the study loan repayment', async ({ page }) => {
    await page.goto('/?sl=1');
    await expect(page.getByTestId('stsl')).toHaveText('−$4,571');
    await page.getByLabel('Salary sacrifice to super (a year)').fill('10,000');
    await expect(page.getByTestId('stsl')).toHaveText('−$4,571');
    await expect(page.getByTestId('income-tax')).toHaveText('−$17,520');
  });

  test('a shared URL restores the full state', async ({ page }) => {
    await page.goto('/?s=90000&sl=1&fy=2025-26');
    await expect(page.getByLabel('Study loan')).toBeChecked();
    await expect(page.getByLabel('Pay amount')).toHaveValue('90,000');
    await expect(page.getByLabel('Financial year')).toHaveValue('2025-26');
    // FY2025-26: tax 17,788; levy 1,800; STSL 3,450
    await expect(page.getByTestId('take-home-annual')).toHaveText('$66,962');
  });

  test('typing a salary updates the URL for sharing', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Pay amount').fill('150,000');
    await expect(page).toHaveURL(/s=150000/);
    // tax 36,570 + levy 3,000 + MLS tier 2 (no hospital cover) 1,875
    await expect(page.getByTestId('take-home-annual')).toHaveText('$108,555');
  });

  test('financial year switch changes the result', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Financial year').selectOption('2024-25');
    // FY2024-25: tax 20,788; levy 2,000; MLS 1% over the $97,000 tier; SG 11.5%
    await expect(page.getByTestId('take-home-annual')).toHaveText('$76,212');
    await expect(page.getByTestId('super')).toHaveText('+$11,500');
  });

  test('working holiday maker hides Medicare and shows the Schedule 15 note', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByLabel('Tax status').selectOption('whm');
    // WHM on 100k: 6,750 + 30% x 55,000 = 23,250, no levy
    await expect(page.getByTestId('take-home-annual')).toHaveText('$76,750');
    await expect(page.getByText('Schedule 15')).toBeVisible();
  });

  test('keyboard-only flow can operate the calculator', async ({ page }) => {
    await page.goto('/');
    const pay = page.getByLabel('Pay amount');
    await pay.focus();
    await pay.selectText();
    await page.keyboard.type('80,000');
    await expect(page).toHaveURL(/s=80000/);
  });
});

test.describe('contract vs permanent', () => {
  test('mode toggle shows the comparison with the default scenario', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Contract vs permanent' }).click();
    await expect(page).toHaveURL(/mode=c/);
    await expect(page.getByTestId('verdict')).toContainText('Contracting pays');
    // 223 paid days at $700/day
    await expect(page.getByText('223 contract paid days')).toBeVisible();
  });

  test('comparison state round-trips through the URL', async ({ page }) => {
    await page.goto('/?mode=c&cr=900&ps=160000&csl=1');
    await expect(page.getByLabel('Contract rate')).toHaveValue('900');
    await expect(page.getByLabel('Permanent salary')).toHaveValue('160,000');
    await expect(page.getByTestId('verdict')).toBeVisible();
  });

  test('lowering the day rate flips the verdict', async ({ page }) => {
    await page.goto('/?mode=c&cr=500');
    await expect(page.getByTestId('verdict')).toContainText('The permanent job pays');
  });
});

test('state selector sets the public holiday default', async ({ page }) => {
  await page.goto('/?mode=c');
  await page.getByLabel('State or territory').selectOption('VIC');
  await expect(page.getByLabel('Public holidays')).toHaveValue('14');
  await expect(page).toHaveURL(/st=VIC/);
  // 260 - 14 - 20 - 5 = 221 paid days
  await expect(page.getByText('221 contract paid days')).toBeVisible();
});

test.describe('mortgage', () => {
  test('mode shows the default loan with the textbook repayment', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mortgage' }).click();
    await expect(page).toHaveURL(/mode=m/);
    // $800k at 6% over 30 years
    await expect(page.getByTestId('mortgage-repayment')).toHaveText('$4,796');
    await expect(page.getByTestId('total-interest')).toContainText('$926,');
  });

  test('rate forecast slider changes future repayments and the URL', async ({ page }) => {
    await page.goto('/?mode=m');
    const before = await page.getByTestId('total-interest').textContent();
    await page.getByLabel('Near term rates percent').fill('9');
    await expect(page).toHaveURL(/mrnp=9/);
    await expect(page.getByTestId('total-interest')).not.toHaveText(before ?? '');
  });

  test('extra repayments surface years and interest saved', async ({ page }) => {
    await page.goto('/?mode=m&mxr=1000');
    await expect(page.getByText(/pays the loan off .* years earlier/)).toBeVisible();
  });

  test('mortgage URL state round-trips', async ({ page }) => {
    await page.goto('/?mode=m&mpv=1500000&mdep=300000&ma1=1200000&mr1=5.5&mtm=25');
    await expect(page.getByRole('textbox', { name: 'Property value' })).toHaveValue('1,500,000');
    await expect(page.getByLabel('Interest rate')).toHaveValue('5.5');
    // 1.2M at 5.5% over 25y = 7,369.30
    await expect(page.getByTestId('mortgage-repayment')).toHaveText('$7,369');
  });
});

test.describe('novated lease', () => {
  // Default state: $75,000 EV (the announced phase-2 exemption cap) over 5
  // years at a typical big-provider 12% implied rate with the ATO-minimum
  // residual. These figures hold while the default commencement stays inside
  // the exempt phases (the $75k cap keeps the car exempt to March 2029).
  test('mode toggle exposes the implied APR and lease-to-own total', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Novated lease' }).click();
    await expect(page).toHaveURL(/mode=n/);
    await expect(page.getByTestId('novated-apr')).toHaveText('12.00%');
    await expect(page.getByTestId('novated-interest')).toHaveText('$27,969');
    await expect(page.getByTestId('lease-total')).toHaveText('$98,547');
    // exempt EV at $100k: the lease wins comfortably at a fair rate
    await expect(page.getByTestId('novated-verdict')).toContainText('$24,290 ahead');
  });

  test('a study loan erodes the advantage via RFBA', async ({ page }) => {
    await page.goto('/?mode=n');
    await expect(page.getByTestId('novated-verdict')).toContainText('$24,290 ahead');
    await page.getByLabel('Study loan').check();
    await expect(page).toHaveURL(/nsl=1/);
    // still ahead, but $6.8k worse over the term than without the debt
    await expect(page.getByTestId('novated-verdict')).toContainText('$17,445 ahead');
    await expect(page.getByTestId('novated-stsl-delta')).toHaveText('+$1,178/yr');
  });

  test('a petrol car on the same numbers flips the verdict', async ({ page }) => {
    await page.goto('/?mode=n&nvt=ice');
    await expect(page.getByTestId('novated-verdict')).toContainText('Cash beats this lease by $2,710');
  });

  test('the residual helper fills the ATO minimum for the term', async ({ page }) => {
    await page.goto('/?mode=n&np=60000&ntm=3');
    // financed 60,000 - 5,455 GST (under the cap); 3-year floor 46.88%
    await expect(page.getByTestId('min-residual')).toHaveText('$25,571');
    await page.getByRole('button', { name: 'use ATO minimum' }).click();
    await expect(page.getByRole('textbox', { name: 'Residual value' })).toHaveValue('25,571');
    await expect(page).toHaveURL(/nrv=25571/);
  });

  test('novated state round-trips through the URL', async ({ page }) => {
    await page.goto('/?mode=n&np=60000&nrv=20000&ntm=3&nclr=6.5');
    await expect(page.getByRole('textbox', { name: 'Car price' })).toHaveValue('60,000');
    await expect(page.getByLabel('Car loan rate')).toHaveValue('6.5');
    await expect(page.getByTestId('novated-apr')).toBeVisible();
    // typing a different amount financed lands in the URL
    await page.getByRole('textbox', { name: 'Amount financed' }).fill('55,000');
    await expect(page).toHaveURL(/naf=55000/);
  });
});

test('stamp duty estimator fills upfront fees', async ({ page }) => {
  await page.goto('/?mode=m');
  // NSW duty on $1,000,000 (FY2026-27): $39,187
  await expect(page.getByTestId('duty-estimate')).toHaveText('$39,187');
  await page.getByRole('button', { name: 'use as upfront fees' }).click();
  await expect(page.getByLabel('Upfront fees')).toHaveValue('39,187');
  await expect(page.getByText(/initial costs \$239,187/)).toBeVisible();
  // switching state recalculates
  await page.getByLabel('Stamp duty state').selectOption('QLD');
  await expect(page.getByTestId('duty-estimate')).toHaveText('$38,025');
});
