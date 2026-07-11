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
