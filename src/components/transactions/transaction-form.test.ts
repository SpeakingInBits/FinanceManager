import { describe, it, expect, beforeEach } from 'vitest';
import '@/components/shared/amount-input';
import './transaction-form';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { millisToDateInput } from '@/utils/date';
import type { TransactionForm } from './transaction-form';
import type { Transaction } from '@/models/transaction';
import type { Budget } from '@/models/budget';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 5000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    subcategoryId: null,
    budgetId: null,
    note: 'Existing note',
    recurrence: null,
    recurrenceEnd: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

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

function mount(): TransactionForm {
  document.body.innerHTML = '';
  const el = document.createElement('transaction-form') as TransactionForm;
  document.body.appendChild(el);
  return el;
}

function setAmount(form: TransactionForm, cents: number): void {
  const amountEl = form.shadowRoot!.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
  amountEl.valueCents = cents;
  amountEl.dispatchEvent(new Event('input', { bubbles: true }));
}

function setRecurrence(form: TransactionForm, value: '' | 'monthly' | 'yearly'): void {
  const select = form.shadowRoot!.querySelector<HTMLSelectElement>('#recurrence')!;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function submit(form: TransactionForm): TransactionSubmitDetail {
  let detail!: TransactionSubmitDetail;
  form.addEventListener(
    AppEvents.TransactionSubmit,
    (e) => {
      detail = (e as CustomEvent<TransactionSubmitDetail>).detail;
    },
    { once: true },
  );
  form.shadowRoot!.querySelector('form')!.requestSubmit();
  return detail;
}

beforeEach(() => {
  appStore.setState({ categories: [], budgets: [] });
  document.body.innerHTML = '';
});

describe('transaction-form', () => {
  it('defaults to a fresh expense with no recurrence when adding', () => {
    const form = mount();
    form.transaction = null;
    const root = form.shadowRoot!;
    expect(root.querySelector('[data-type="expense"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector<HTMLSelectElement>('#recurrence')!.value).toBe('');
    expect(root.querySelector<HTMLElement & { valueCents: number }>('#amount')!.valueCents).toBe(0);
  });

  it('populates all fields when editing an existing transaction', () => {
    const form = mount();
    const t = makeTransaction({ type: 'income', recurrence: 'yearly', amount: 120000 });
    form.transaction = t;
    const root = form.shadowRoot!;
    expect(root.querySelector('[data-type="income"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector<HTMLSelectElement>('#recurrence')!.value).toBe('yearly');
    expect(root.querySelector<HTMLElement & { valueCents: number }>('#amount')!.valueCents).toBe(120000);
    expect(root.querySelector<HTMLInputElement>('#date')!.value).toBe(millisToDateInput(t.date));
    expect(root.querySelector<HTMLTextAreaElement>('#note')!.value).toBe('Existing note');
  });

  it('shows the monthly-equivalent hint only for yearly recurrence', () => {
    const form = mount();
    form.transaction = null;
    setAmount(form, 120000);
    expect(form.shadowRoot!.querySelector('.hint')).toBeNull();

    setRecurrence(form, 'yearly');
    expect(form.shadowRoot!.querySelector('.hint')!.textContent).toBe('= $100.00/month');

    setRecurrence(form, 'monthly');
    expect(form.shadowRoot!.querySelector('.hint')).toBeNull();
  });

  it('updates the hint live as the amount changes while yearly is selected', () => {
    const form = mount();
    form.transaction = null;
    setRecurrence(form, 'yearly');
    setAmount(form, 60000);
    expect(form.shadowRoot!.querySelector('.hint')!.textContent).toBe('= $50.00/month');
  });

  it('regression: preserves the entered amount when the recurrence selection changes', () => {
    const form = mount();
    form.transaction = null;
    setAmount(form, 120000);
    setRecurrence(form, 'yearly');
    const amountEl = form.shadowRoot!.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
    expect(amountEl.valueCents).toBe(120000);
  });

  it('regression: preserves the entered amount when the type toggle changes', () => {
    const form = mount();
    form.transaction = null;
    setAmount(form, 7500);
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-type="income"]')!.click();
    const amountEl = form.shadowRoot!.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
    expect(amountEl.valueCents).toBe(7500);
  });

  it('regression: preserves the note and date across a recurrence change', () => {
    const form = mount();
    form.transaction = null;
    const noteEl = form.shadowRoot!.querySelector<HTMLTextAreaElement>('#note')!;
    noteEl.value = 'Car insurance';
    noteEl.dispatchEvent(new Event('input', { bubbles: true }));
    const dateEl = form.shadowRoot!.querySelector<HTMLInputElement>('#date')!;
    dateEl.value = '2026-03-15';
    dateEl.dispatchEvent(new Event('input', { bubbles: true }));

    setRecurrence(form, 'yearly');

    expect(form.shadowRoot!.querySelector<HTMLTextAreaElement>('#note')!.value).toBe('Car insurance');
    expect(form.shadowRoot!.querySelector<HTMLInputElement>('#date')!.value).toBe('2026-03-15');
  });

  it('hides the subcategory field when no top-level category is selected', () => {
    appStore.setState({
      categories: [
        { id: 'travel', name: 'Travel', parentId: null, color: '#000', createdAt: 0 },
        { id: 'flights', name: 'Flights', parentId: 'travel', color: '#000', createdAt: 0 },
      ],
    });
    const form = mount();
    form.transaction = null;
    expect(form.shadowRoot!.querySelector('#subcategory')).toBeNull();
  });

  it('shows only the selected category\'s children in the subcategory field', () => {
    appStore.setState({
      categories: [
        { id: 'travel', name: 'Travel', parentId: null, color: '#000', createdAt: 0 },
        { id: 'flights', name: 'Flights', parentId: 'travel', color: '#000', createdAt: 0 },
        { id: 'food', name: 'Food', parentId: null, color: '#000', createdAt: 0 },
      ],
    });
    const form = mount();
    form.transaction = null;
    const categorySelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#category')!;
    categorySelect.value = 'travel';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    const subcategoryOptions = [
      ...form.shadowRoot!.querySelectorAll<HTMLOptionElement>('#subcategory option'),
    ].map((o) => o.textContent);
    expect(subcategoryOptions).toEqual(['None', 'Flights']);
  });

  it('does not reset in-progress input when the app store updates for an unrelated reason', () => {
    const form = mount();
    form.transaction = null;
    setAmount(form, 4200);
    appStore.setState({ categories: [] });
    const amountEl = form.shadowRoot!.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
    expect(amountEl.valueCents).toBe(4200);
  });

  it('submits a new transaction with the chosen recurrence', () => {
    const form = mount();
    form.transaction = null;
    setAmount(form, 120000);
    setRecurrence(form, 'yearly');
    const detail = submit(form);
    expect(detail.id).toBeUndefined();
    expect(detail.input).toMatchObject({
      type: 'expense',
      amount: 120000,
      recurrence: 'yearly',
      categoryId: null,
      budgetId: null,
    });
  });

  it('submits an edit including the transaction id', () => {
    const form = mount();
    const t = makeTransaction();
    form.transaction = t;
    const detail = submit(form);
    expect(detail.id).toBe(t.id);
  });

  it('submits recurrence: null for a one-off transaction', () => {
    const form = mount();
    form.transaction = null;
    const detail = submit(form);
    expect(detail.input.recurrence).toBeNull();
  });

  it('trims whitespace from the note on submit', () => {
    const form = mount();
    form.transaction = null;
    const noteEl = form.shadowRoot!.querySelector<HTMLTextAreaElement>('#note')!;
    noteEl.value = '  padded note  ';
    noteEl.dispatchEvent(new Event('input', { bubbles: true }));
    const detail = submit(form);
    expect(detail.input.note).toBe('padded note');
  });

  it('hides the category field and requires a budget in Fill budget mode', () => {
    appStore.setState({
      categories: [{ id: 'travel', name: 'Travel', parentId: null, color: '#000', createdAt: 0 }],
      budgets: [makeBudget()],
    });
    const form = mount();
    form.transaction = null;
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-type="allocation"]')!.click();
    expect(form.shadowRoot!.querySelector('#category')).toBeNull();
    const budgetSelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#budget')!;
    expect(budgetSelect.required).toBe(true);
  });

  it('submits an allocation with the chosen budget and no category', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount();
    form.transaction = null;
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-type="allocation"]')!.click();
    setAmount(form, 2500);
    const budgetSelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#budget')!;
    budgetSelect.value = 'b1';
    budgetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const detail = submit(form);
    expect(detail.input).toMatchObject({
      type: 'allocation',
      amount: 2500,
      budgetId: 'b1',
      categoryId: null,
      subcategoryId: null,
    });
  });

  it('does not submit an allocation without a budget selected', () => {
    const form = mount();
    form.transaction = null;
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-type="allocation"]')!.click();
    let submitted = false;
    form.addEventListener(AppEvents.TransactionSubmit, () => {
      submitted = true;
    });
    // Dispatch submit directly to bypass browser constraint validation, exercising the guard.
    form.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submitted).toBe(false);
  });

  it('hides the budget field for income and submits budgetId: null', () => {
    const form = mount();
    form.transaction = null;
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-type="income"]')!.click();
    expect(form.shadowRoot!.querySelector('#budget')).toBeNull();
    const detail = submit(form);
    expect(detail.input).toMatchObject({ type: 'income', budgetId: null });
  });

  it('populates the budget select when editing an allocation', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount();
    form.transaction = makeTransaction({ type: 'allocation', budgetId: 'b1', categoryId: null });
    const root = form.shadowRoot!;
    expect(root.querySelector('[data-type="allocation"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector<HTMLSelectElement>('#budget')!.value).toBe('b1');
  });

  it('dispatches form-cancel when the cancel button is clicked', () => {
    const form = mount();
    form.transaction = null;
    let cancelled = false;
    form.addEventListener('form-cancel', () => {
      cancelled = true;
    });
    form.shadowRoot!.querySelector<HTMLButtonElement>('.cancel-btn')!.click();
    expect(cancelled).toBe(true);
  });

  it('dispatches form-done after a successful submit', () => {
    const form = mount();
    form.transaction = null;
    let done = false;
    form.addEventListener('form-done', () => {
      done = true;
    });
    form.shadowRoot!.querySelector('form')!.requestSubmit();
    expect(done).toBe(true);
  });
});

describe('transaction-form withdrawals', () => {
  function withdrawMode(form: TransactionForm): void {
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-type="withdrawal"]')!.click();
  }

  it('hides the category field and requires a budget in Withdraw mode', () => {
    appStore.setState({
      categories: [{ id: 'travel', name: 'Travel', parentId: null, color: '#000', createdAt: 0 }],
      budgets: [makeBudget()],
    });
    const form = mount();
    form.transaction = null;
    withdrawMode(form);
    const root = form.shadowRoot!;
    expect(root.querySelector('#category')).toBeNull();
    expect(root.querySelector('label[for="budget"]')!.textContent).toBe('Withdraw from');
    expect(root.querySelector<HTMLSelectElement>('#budget')!.required).toBe(true);
  });

  it('submits a withdrawal from the chosen budget with no category', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount();
    form.transaction = null;
    withdrawMode(form);
    setAmount(form, 1200);
    const budgetSelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#budget')!;
    budgetSelect.value = 'b1';
    budgetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(submit(form).input).toMatchObject({
      type: 'withdrawal',
      amount: 1200,
      budgetId: 'b1',
      categoryId: null,
      subcategoryId: null,
    });
  });

  it('does not submit a withdrawal without a budget selected', () => {
    const form = mount();
    form.transaction = null;
    withdrawMode(form);
    let submitted = false;
    form.addEventListener(AppEvents.TransactionSubmit, () => {
      submitted = true;
    });
    form.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submitted).toBe(false);
  });

  it('opens an existing withdrawal in Withdraw mode with its budget selected', () => {
    appStore.setState({ budgets: [makeBudget()] });
    const form = mount();
    form.transaction = makeTransaction({ type: 'withdrawal', budgetId: 'b1', categoryId: null });
    const root = form.shadowRoot!;
    expect(root.querySelector('[data-type="withdrawal"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector<HTMLSelectElement>('#budget')!.value).toBe('b1');
    expect(submit(form).input).toMatchObject({ type: 'withdrawal', budgetId: 'b1' });
  });
});
