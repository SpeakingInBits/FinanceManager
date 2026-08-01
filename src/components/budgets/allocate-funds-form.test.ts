import { describe, it, expect, beforeEach } from 'vitest';
import '@/components/shared/amount-input';
import './allocate-funds-form';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import type { AllocateFundsForm } from './allocate-funds-form';
import type { Budget } from '@/models/budget';

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Vacation',
    description: '',
    targetAmount: 10000,
    periodType: 'monthly',
    startDate: 0,
    endDate: null,
    categoryId: null,
    subcategoryId: null,
    createdAt: 0,
    ...overrides,
  };
}

function mount(available: number): AllocateFundsForm {
  document.body.innerHTML = '';
  const el = document.createElement('allocate-funds-form') as AllocateFundsForm;
  document.body.appendChild(el);
  el.allocationDate = new Date(2026, 6, 15).getTime();
  el.availableFunds = available;
  return el;
}

function setAmount(form: AllocateFundsForm, index: number, cents: number): void {
  const input = form.shadowRoot!.querySelectorAll<HTMLElement & { valueCents: number }>(
    'amount-input',
  )[index]!;
  input.valueCents = cents;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function submitted(form: AllocateFundsForm): TransactionSubmitDetail[] {
  const details: TransactionSubmitDetail[] = [];
  form.addEventListener(AppEvents.TransactionSubmit, (e) => {
    details.push((e as CustomEvent<TransactionSubmitDetail>).detail);
  });
  form.shadowRoot!.querySelector('form')!.requestSubmit();
  return details;
}

beforeEach(() => {
  appStore.setState({ budgets: [] });
  document.body.innerHTML = '';
});

describe('allocate-funds-form', () => {
  it('renders one amount row per budget', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1', name: 'Vacation' }), makeBudget({ id: 'b2', name: 'Car' })],
    });
    const form = mount(10000);
    const labels = [...form.shadowRoot!.querySelectorAll('.budget-row label')].map(
      (l) => l.textContent,
    );
    expect(labels).toEqual(['Vacation', 'Car']);
  });

  it('shows the full amount as left to allocate before anything is entered', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount(29000);
    expect(form.shadowRoot!.querySelector('.remaining')!.textContent).toBe(
      'Left to allocate: $290.00',
    );
  });

  it('updates the left-to-allocate line as amounts are entered', () => {
    appStore.setState({ budgets: [makeBudget({ id: 'b1' }), makeBudget({ id: 'b2', name: 'Car' })] });
    const form = mount(29000);
    setAmount(form, 0, 10000);
    setAmount(form, 1, 4000);
    expect(form.shadowRoot!.querySelector('.remaining')!.textContent).toBe(
      'Left to allocate: $150.00',
    );
  });

  it('disables Allocate when nothing has been entered', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount(29000);
    expect(form.shadowRoot!.querySelector<HTMLButtonElement>('.allocate-btn')!.disabled).toBe(true);
  });

  it('disables Allocate and flags the overage when the total exceeds available funds', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount(29000);
    setAmount(form, 0, 30000);
    const remaining = form.shadowRoot!.querySelector('.remaining')!;
    expect(remaining.textContent).toBe('Over by $10.00');
    expect(remaining.classList.contains('over')).toBe(true);
    expect(form.shadowRoot!.querySelector<HTMLButtonElement>('.allocate-btn')!.disabled).toBe(true);
  });

  it('does not dispatch anything when submitted over the available funds', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount(29000);
    setAmount(form, 0, 30000);
    expect(submitted(form)).toEqual([]);
  });

  it('dispatches one allocation per budget with a non-zero amount, skipping zero rows', () => {
    appStore.setState({
      budgets: [
        makeBudget({ id: 'b1', name: 'Vacation' }),
        makeBudget({ id: 'b2', name: 'Car' }),
        makeBudget({ id: 'b3', name: 'Emergency' }),
      ],
    });
    const form = mount(29000);
    setAmount(form, 0, 10000);
    setAmount(form, 2, 5000);
    const details = submitted(form);
    expect(details).toHaveLength(2);
    expect(details[0]!.input).toMatchObject({
      type: 'allocation',
      amount: 10000,
      budgetId: 'b1',
      categoryId: null,
      subcategoryId: null,
      recurrence: null,
      date: new Date(2026, 6, 15).getTime(),
    });
    expect(details[1]!.input).toMatchObject({ type: 'allocation', amount: 5000, budgetId: 'b3' });
  });

  it('allows allocating exactly the available amount, bringing the remainder to zero', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount(29000);
    setAmount(form, 0, 29000);
    expect(form.shadowRoot!.querySelector('.remaining')!.textContent).toBe(
      'Left to allocate: $0.00',
    );
    expect(form.shadowRoot!.querySelector<HTMLButtonElement>('.allocate-btn')!.disabled).toBe(false);
    expect(submitted(form)).toHaveLength(1);
  });

  it('dispatches form-done after a successful allocation', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount(29000);
    setAmount(form, 0, 1000);
    let done = false;
    form.addEventListener('form-done', () => {
      done = true;
    });
    form.shadowRoot!.querySelector('form')!.requestSubmit();
    expect(done).toBe(true);
  });

  it('dispatches form-cancel when cancel is clicked', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount(29000);
    let cancelled = false;
    form.addEventListener('form-cancel', () => {
      cancelled = true;
    });
    form.shadowRoot!.querySelector<HTMLButtonElement>('.cancel-btn')!.click();
    expect(cancelled).toBe(true);
  });

  it('shows a create-a-budget message instead of rows when there are no budgets', () => {
    const form = mount(29000);
    expect(form.shadowRoot!.querySelector('amount-input')).toBeNull();
    expect(form.shadowRoot!.textContent).toContain('Create a budget first');
  });
});
