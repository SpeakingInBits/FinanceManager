import { describe, it, expect } from 'vitest';
// Vitest stubs CSS imports to an empty string unless the file matches `test.css.include` in
// vite.config.ts, which is where these two stylesheets are opted in.
import transactionFormCss from '@/components/transactions/transaction-form.css?inline';
import budgetFormCss from '@/components/budgets/budget-form.css?inline';

/**
 * jsdom does no layout, so overflow itself can't be observed here. Instead, guard the two
 * declarations that keep a two-column `.row` inside its form: the row wraps when both fields
 * can't fit, and each field may shrink below its control's intrinsic width (a long category
 * name, a date picker). Without them the fields push past the form's right edge.
 */
function ruleStyle(css: string, selector: string): CSSStyleDeclaration {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const rule = [...sheet.cssRules].find(
    (r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText === selector,
  );
  if (!rule) throw new Error(`No "${selector}" rule found`);
  return rule.style;
}

describe.each([
  ['transaction-form', transactionFormCss],
  ['budget-form', budgetFormCss],
])('%s two-column rows', (_name, css) => {
  it('wraps onto separate lines when both fields do not fit', () => {
    expect(ruleStyle(css, '.row').flexWrap).toBe('wrap');
  });

  it("lets each field shrink below its control's intrinsic width", () => {
    const field = ruleStyle(css, '.row .field');
    expect(['0', '0px']).toContain(field.minWidth);
    expect(field.flexShrink).toBe('1');
  });
});
