import shadowResetCss from '@/styles/shadow-reset.css?inline';
import sharedControlsCss from '@/styles/shared-controls.css?inline';

const sheetCache = new Map<string, CSSStyleSheet>();

function getSheet(css: string): CSSStyleSheet {
  let sheet = sheetCache.get(css);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    sheetCache.set(css, sheet);
  }
  return sheet;
}

const sharedSheets = [getSheet(shadowResetCss), getSheet(sharedControlsCss)];

/** Adopts the shared shadow-DOM reset/controls plus a component's own CSS into a shadow root. */
export function adoptStyles(root: ShadowRoot, css: string): void {
  root.adoptedStyleSheets = [...(root.adoptedStyleSheets ?? []), ...sharedSheets, getSheet(css)];
}
