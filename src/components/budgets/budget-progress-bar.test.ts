import { describe, it, expect, beforeEach } from 'vitest';
import './budget-progress-bar';
import type { BudgetProgressBar } from './budget-progress-bar';
import type { BudgetStats } from '@/utils/budget';

function mount(): BudgetProgressBar {
  document.body.innerHTML = '';
  const el = document.createElement('budget-progress-bar') as BudgetProgressBar;
  document.body.appendChild(el);
  return el;
}

function stats(overrides: Partial<BudgetStats> = {}): BudgetStats {
  return {
    balance: 0,
    overdrawn: false,
    contributed: 0,
    target: 0,
    contributionPercent: 0,
    contributionComplete: false,
    ...overrides,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('budget-progress-bar', () => {
  it('renders nothing until stats are set', () => {
    const el = mount();
    expect(el.shadowRoot!.innerHTML.trim()).toBe('');
  });

  it('shows contributed and target amounts', () => {
    const el = mount();
    el.stats = stats({ contributed: 2500, target: 10000 });
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toContain('$25.00 contributed');
    expect(el.shadowRoot!.querySelector('.label')!.textContent).toContain('$100.00 goal');
  });

  it('shows the lifetime balance', () => {
    const el = mount();
    el.stats = stats({ balance: 5000 });
    expect(el.shadowRoot!.querySelector('.balance')!.textContent).toContain('$50.00');
  });

  it('sizes the fill bar proportionally to contribution percent', () => {
    const el = mount();
    el.stats = stats({ contributionPercent: 0.25 });
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });

  it('caps the fill bar width at 100% even when contribution exceeds the target', () => {
    const el = mount();
    el.stats = stats({ contributionPercent: 1.5 });
    const fill = el.shadowRoot!.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('applies the over class to the balance line when overdrawn', () => {
    const el = mount();
    el.stats = stats({ overdrawn: true, balance: -500 });
    expect(el.shadowRoot!.querySelector('.balance')!.classList.contains('over')).toBe(true);
  });

  it('does not apply the over class to the balance line when not overdrawn', () => {
    const el = mount();
    el.stats = stats({ overdrawn: false });
    expect(el.shadowRoot!.querySelector('.balance')!.classList.contains('over')).toBe(false);
  });

  it('applies the warning state to the fill bar when nearing the target', () => {
    const el = mount();
    el.stats = stats({ contributionPercent: 0.9 });
    expect(el.shadowRoot!.querySelector('.fill')!.classList.contains('warning')).toBe(true);
  });

  it('does not apply the warning state once the target is fully reached', () => {
    const el = mount();
    el.stats = stats({ contributionPercent: 1 });
    expect(el.shadowRoot!.querySelector('.fill')!.classList.contains('warning')).toBe(false);
  });

  it('applies no state class when comfortably under the target', () => {
    const el = mount();
    el.stats = stats({ contributionPercent: 0.1 });
    expect(el.shadowRoot!.querySelector('.fill')!.classList.contains('warning')).toBe(false);
  });
});
