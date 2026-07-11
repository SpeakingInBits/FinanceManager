// jsdom doesn't implement the form-associated custom element APIs on
// ElementInternals (setFormValue, validity, etc.) — polyfill no-op stubs so
// components using attachInternals() (e.g. amount-input) work under test.
// https://github.com/jsdom/jsdom/issues/2685
if (typeof ElementInternals !== 'undefined' && !('setFormValue' in ElementInternals.prototype)) {
  Object.assign(ElementInternals.prototype, {
    setFormValue() {},
    setValidity() {},
    checkValidity() {
      return true;
    },
    reportValidity() {
      return true;
    },
  });
}

// jsdom doesn't implement ResizeObserver at all — stub a no-op so chart components
// (which observe their svg's size to size-and-render) can construct under test.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
