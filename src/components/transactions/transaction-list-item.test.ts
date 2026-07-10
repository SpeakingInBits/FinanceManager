import { describe, it, expect, beforeEach } from 'vitest';
import '@/components/shared/icon';
import './transaction-list-item';
import type { MonthlyOccurrence } from '@/utils/recurrence';
import type { Transaction } from '@/models/transaction';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    budgetId: null,
    note: '',
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function mount(occurrence: MonthlyOccurrence, categoryName = 'Uncategorized', categoryColor = '#9aa0a6') {
  document.body.innerHTML = '';
  const el = document.createElement('transaction-list-item') as HTMLElement & {
    occurrence: MonthlyOccurrence;
    categoryName: string;
    categoryColor: string;
  };
  document.body.appendChild(el);
  el.categoryName = categoryName;
  el.categoryColor = categoryColor;
  el.occurrence = occurrence;
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('transaction-list-item', () => {
  it('shows the note when present, falling back to the category name otherwise', () => {
    const withNote = mount({
      transaction: makeTransaction({ note: 'Coffee' }),
      displayDate: Date.now(),
      displayAmount: 1000,
    });
    expect(withNote.shadowRoot!.querySelector('.note')!.textContent).toBe('Coffee');

    const withoutNote = mount(
      { transaction: makeTransaction({ note: '' }), displayDate: Date.now(), displayAmount: 1000 },
      'Groceries',
    );
    expect(withoutNote.shadowRoot!.querySelector('.note')!.textContent).toBe('Groceries');
  });

  it('renders an expense amount with a minus sign', () => {
    const el = mount({
      transaction: makeTransaction({ type: 'expense' }),
      displayDate: Date.now(),
      displayAmount: 1000,
    });
    const amount = el.shadowRoot!.querySelector('.amount')!;
    expect(amount.textContent).toBe('-$10.00');
    expect(amount.classList.contains('expense')).toBe(true);
  });

  it('renders an income amount with a plus sign', () => {
    const el = mount({
      transaction: makeTransaction({ type: 'income' }),
      displayDate: Date.now(),
      displayAmount: 2500,
    });
    const amount = el.shadowRoot!.querySelector('.amount')!;
    expect(amount.textContent).toBe('+$25.00');
    expect(amount.classList.contains('income')).toBe(true);
  });

  it('displays the monthly-equivalent amount, not the raw transaction amount', () => {
    const el = mount({
      transaction: makeTransaction({ amount: 120000, recurrence: 'yearly' }),
      displayDate: Date.now(),
      displayAmount: 10000,
    });
    expect(el.shadowRoot!.querySelector('.amount')!.textContent).toBe('-$100.00');
  });

  it('shows no recurrence badge for a one-off transaction', () => {
    const el = mount({ transaction: makeTransaction(), displayDate: Date.now(), displayAmount: 1000 });
    expect(el.shadowRoot!.querySelector('.meta')!.textContent).not.toContain('Yearly');
    expect(el.shadowRoot!.querySelector('.meta')!.textContent).not.toContain('Monthly');
  });

  it('shows the yearly recurrence badge with the original per-occurrence amount', () => {
    const el = mount({
      transaction: makeTransaction({ amount: 120000, recurrence: 'yearly' }),
      displayDate: Date.now(),
      displayAmount: 10000,
    });
    expect(el.shadowRoot!.querySelector('.meta')!.textContent).toContain('Yearly ($1,200.00/yr)');
  });

  it('shows the monthly recurrence badge', () => {
    const el = mount({
      transaction: makeTransaction({ amount: 1000, recurrence: 'monthly' }),
      displayDate: Date.now(),
      displayAmount: 1000,
    });
    expect(el.shadowRoot!.querySelector('.meta')!.textContent).toContain('Monthly ($10.00/mo)');
  });

  it('dispatches an edit event with the transaction id', () => {
    const t = makeTransaction();
    const el = mount({ transaction: t, displayDate: Date.now(), displayAmount: 1000 });
    let detail: { id: string } | undefined;
    el.addEventListener('edit', (e) => {
      detail = (e as CustomEvent<{ id: string }>).detail;
    });
    (el.shadowRoot!.querySelector('.edit-btn') as HTMLButtonElement).click();
    expect(detail).toEqual({ id: t.id });
  });

  it('dispatches a delete event with the transaction id', () => {
    const t = makeTransaction();
    const el = mount({ transaction: t, displayDate: Date.now(), displayAmount: 1000 });
    let detail: { id: string } | undefined;
    el.addEventListener('delete', (e) => {
      detail = (e as CustomEvent<{ id: string }>).detail;
    });
    (el.shadowRoot!.querySelector('.delete-btn') as HTMLButtonElement).click();
    expect(detail).toEqual({ id: t.id });
  });
});
