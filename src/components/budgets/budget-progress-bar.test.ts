import { describe, it, expect, beforeEach } from 'vitest';
import './budget-progress-bar';
import type { BudgetProgressBar } from './budget-progress-bar';
import type { BudgetProgress } from '@/utils/budget';

function mount(): BudgetProgressBar {
  document.body.innerHTML = '';
  const el = document.createElement('budget-progress-bar') as BudgetProgressBar;
  document.body.appendChild(el);
  return el;
}

function progress(overrides: Partial<BudgetProgress> = {}): BudgetProgress {
  return { spent: 0, remaining: 0, percent: 0, over: false, ...overrides };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('budget-progress-bar', () => {
  it('renders nothing until progress is set', () => {
    const el = mount();
    expect(el.shadowRoot!.innerHTML.trim()).toBe('');
  });

  it('shows spent and total amounts', () => {
    const el = mount();
    el.total = 10000;
    el.progress = progress({ spent: 2500 });
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toContain('$25.00 spent');
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toContain('$100.00 budget');
  });

  it('sizes the fill bar proportionally to percent spent', () => {
    const el = mount();
    el.total = 10000;
    el.progress = progress({ spent: 2500, percent: 0.25 });
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });

  it('caps the fill bar width at 100% even when over budget', () => {
    const el = mount();
    el.total = 10000;
    el.progress = progress({ spent: 15000, percent: 1.5, over: true });
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('applies the over state class when over budget', () => {
    const el = mount();
    el.total = 10000;
    el.progress = progress({ spent: 15000, percent: 1.5, over: true });
    expect(el.shadowRoot!.querySelector('.fill')!.classList.contains('over')).toBe(true);
  });

  it('applies the warning state class when nearing the budget without being over', () => {
    const el = mount();
    el.total = 10000;
    el.progress = progress({ spent: 9000, percent: 0.9, over: false });
    const fill = el.shadowRoot!.querySelector('.fill')!;
    expect(fill.classList.contains('warning')).toBe(true);
    expect(fill.classList.contains('over')).toBe(false);
  });

  it('applies no state class when comfortably under budget', () => {
    const el = mount();
    el.total = 10000;
    el.progress = progress({ spent: 1000, percent: 0.1, over: false });
    const fill = el.shadowRoot!.querySelector('.fill')!;
    expect(fill.classList.contains('warning')).toBe(false);
    expect(fill.classList.contains('over')).toBe(false);
  });
});
