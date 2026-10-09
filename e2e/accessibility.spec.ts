import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Each calculator with its optional sections open, so the scan sees them
const PAGES: [string, string][] = [
  ['salary', '/?sp=1&dep=2&sl=1&ss=5000'],
  ['contract vs permanent', '/?mode=c&csl=1'],
  ['mortgage', '/?mode=m&msp=1&mxr=200'],
  ['novated lease', '/?mode=n&nsl=1'],
];

for (const [name, path] of PAGES) {
  test(`${name} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
      .analyze();
    expect(violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`)).toEqual([]);
  });
}
