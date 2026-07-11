import { describe, it, expect, beforeEach } from 'vitest';
import './amount-input';
import type { AmountInput } from './amount-input';

function mount(value?: number): AmountInput {
  const el = document.createElement('amount-input') as AmountInput;
  if (value !== undefined) el.setAttribute('value', String(value));
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('amount-input', () => {
  it('initializes from the value attribute, formatted as dollars', () => {
    const el = mount(1050);
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('10.50');
    expect(el.valueCents).toBe(1050);
  });

  it('defaults to 0 when no value attribute is set', () => {
    const el = mount();
    expect(el.valueCents).toBe(0);
  });

  it('leaves the field empty (showing the placeholder) for a zero value attribute', () => {
    const el = mount(0);
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('0.00');
  });

  it('clears back to empty when valueCents is programmatically set to 0', () => {
    const el = mount();
    el.valueCents = 999;
    el.valueCents = 0;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('');
  });

  it('parses cents back out of typed input', () => {
    const el = mount();
    const input = el.shadowRoot!.querySelector('input')!;
    input.value = '25.99';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.valueCents).toBe(2599);
  });

  it('re-renders the formatted display when valueCents is set programmatically', () => {
    const el = mount();
    el.valueCents = 999;
    const input = el.shadowRoot!.querySelector('input')!;
    expect(input.value).toBe('9.99');
  });

  it('dispatches a bubbling input event on user input', () => {
    const el = mount();
    let fired = false;
    el.addEventListener('input', () => {
      fired = true;
    });
    const input = el.shadowRoot!.querySelector('input')!;
    input.value = '5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(fired).toBe(true);
  });
});
