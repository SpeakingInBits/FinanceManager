import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@/components/shared/icon';
import '@/components/shared/empty-state';
import './transaction-list-item';
import './transaction-list';
import { appStore } from '@/state/app-store';
import { AppEvents } from '@/state/events';
import { startOfMonth } from '@/utils/date';
import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    subcategoryId: null,
    budgetId: null,
    note: '',
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const july = startOfMonth(new Date(2026, 6, 15).getTime());

function setup(transactions: Transaction[], categories: Category[] = [], selectedMonth = july) {
  appStore.setState({ transactions, categories, selectedMonth });
  document.body.innerHTML = '';
  const el = document.createElement('transaction-list');
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  appStore.setState({ transactions: [], categories: [], selectedMonth: july });
  document.body.innerHTML = '';
});

describe('transaction-list', () => {
  it('shows an empty state when there are no transactions for the selected month', () => {
    const el = setup([]);
    expect(el.shadowRoot!.querySelector('empty-state')).toBeTruthy();
  });

  it('renders one item per occurrence in the selected month', () => {
    const el = setup([
      makeTransaction({ id: 'a', date: new Date(2026, 6, 5).getTime() }),
      makeTransaction({ id: 'b', date: new Date(2026, 6, 20).getTime() }),
      makeTransaction({ id: 'c', date: new Date(2026, 5, 20).getTime() }), // different month
    ]);
    const items = el.shadowRoot!.querySelectorAll('transaction-list-item');
    expect(items).toHaveLength(2);
  });

  it('sorts occurrences newest-first', () => {
    const el = setup([
      makeTransaction({ id: 'early', note: 'Early one', date: new Date(2026, 6, 3).getTime() }),
      makeTransaction({ id: 'late', note: 'Late one', date: new Date(2026, 6, 25).getTime() }),
    ]);
    const notes = [...el.shadowRoot!.querySelectorAll('transaction-list-item')].map(
      (item) => item.shadowRoot!.querySelector('.note')!.textContent,
    );
    expect(notes).toEqual(['Late one', 'Early one']);
  });

  it('resolves the category name and color for each transaction', () => {
    const el = setup(
      [makeTransaction({ categoryId: 'food' })],
      [{ id: 'food', name: 'Food', parentId: null, color: '#abcdef', createdAt: 0 }],
    );
    const item = el.shadowRoot!.querySelector('transaction-list-item')!;
    expect(item.shadowRoot!.querySelector('.meta')!.textContent).toContain('Food');
    expect((item.shadowRoot!.querySelector('.swatch') as HTMLElement).style.background).toBe(
      'rgb(171, 205, 239)',
    );
  });

  it('falls back to Uncategorized for transactions with no matching category', () => {
    const el = setup([makeTransaction({ categoryId: null })]);
    const item = el.shadowRoot!.querySelector('transaction-list-item')!;
    expect(item.shadowRoot!.querySelector('.meta')!.textContent).toContain('Uncategorized');
    expect((item.shadowRoot!.querySelector('.swatch') as HTMLElement).style.background).toBe(
      'rgb(154, 160, 166)',
    );
  });

  it('re-renders when the selected month changes', () => {
    const el = setup([
      makeTransaction({ id: 'a', date: new Date(2026, 6, 5).getTime() }),
      makeTransaction({ id: 'b', date: new Date(2026, 5, 5).getTime() }),
    ]);
    expect(el.shadowRoot!.querySelectorAll('transaction-list-item')).toHaveLength(1);
    appStore.setState({ selectedMonth: startOfMonth(new Date(2026, 5, 1).getTime()) });
    expect(el.shadowRoot!.querySelectorAll('transaction-list-item')).toHaveLength(1);
  });

  it('bubbles a transaction-delete event with the id after confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const el = setup([makeTransaction({ id: 'to-delete' })]);
    let detailId: string | undefined;
    el.addEventListener(AppEvents.TransactionDelete, (e) => {
      detailId = (e as CustomEvent<{ id: string }>).detail.id;
    });
    const item = el.shadowRoot!.querySelector('transaction-list-item')!;
    (item.shadowRoot!.querySelector('.delete-btn') as HTMLButtonElement).click();
    expect(detailId).toBe('to-delete');
    vi.restoreAllMocks();
  });

  it('does not dispatch transaction-delete when the user cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const el = setup([makeTransaction({ id: 'keep-me' })]);
    const handler = vi.fn();
    el.addEventListener(AppEvents.TransactionDelete, handler);
    const item = el.shadowRoot!.querySelector('transaction-list-item')!;
    (item.shadowRoot!.querySelector('.delete-btn') as HTMLButtonElement).click();
    expect(handler).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('bubbles an edit-transaction event with the id', () => {
    const el = setup([makeTransaction({ id: 'to-edit' })]);
    let detailId: string | undefined;
    el.addEventListener('edit-transaction', (e) => {
      detailId = (e as CustomEvent<{ id: string }>).detail.id;
    });
    const item = el.shadowRoot!.querySelector('transaction-list-item')!;
    (item.shadowRoot!.querySelector('.edit-btn') as HTMLButtonElement).click();
    expect(detailId).toBe('to-edit');
  });
});

describe('transaction-list grouping', () => {
  const categories: Category[] = [
    { id: 'travel', name: 'Travel', parentId: null, color: '#2f6fed', createdAt: 0 },
    { id: 'flights', name: 'Flights', parentId: 'travel', color: '#2f6fed', createdAt: 0 },
    { id: 'hotels', name: 'Hotels', parentId: 'travel', color: '#2f6fed', createdAt: 0 },
    { id: 'food', name: 'Food', parentId: null, color: '#e07a3e', createdAt: 0 },
  ];

  function titles(el: HTMLElement, selector: string): string[] {
    return [...el.shadowRoot!.querySelectorAll(selector)].map((n) => n.textContent ?? '');
  }

  it('splits transactions into Recurring and One-time sections', () => {
    const el = setup([
      makeTransaction({ id: 'a', recurrence: 'monthly' }),
      makeTransaction({ id: 'b', recurrence: null }),
    ]);
    expect(titles(el, '.group-title')).toEqual(['Recurring', 'One-time']);
  });

  it('omits a section that has no transactions', () => {
    const el = setup([makeTransaction({ id: 'a', recurrence: null })]);
    expect(titles(el, '.group-title')).toEqual(['One-time']);
  });

  it('groups by category within a recurrence section, Uncategorized last', () => {
    const el = setup(
      [
        makeTransaction({ id: 'a', categoryId: 'food' }),
        makeTransaction({ id: 'b', categoryId: 'travel', subcategoryId: 'flights' }),
        makeTransaction({ id: 'c', categoryId: null }),
      ],
      categories,
    );
    expect(titles(el, '.category-title')).toEqual(['Food', 'Travel', 'Uncategorized']);
  });

  it('groups by subcategory within a category, with an Other bucket for direct transactions', () => {
    const el = setup(
      [
        makeTransaction({ id: 'a', categoryId: 'travel', subcategoryId: 'flights' }),
        makeTransaction({ id: 'b', categoryId: 'travel', subcategoryId: 'hotels' }),
        makeTransaction({ id: 'c', categoryId: 'travel', subcategoryId: null }),
      ],
      categories,
    );
    expect(titles(el, '.subcategory-title')).toEqual(['Flights', 'Hotels', 'Other']);
  });

  it('does not show a subcategory header when a category has no subcategories in use', () => {
    const el = setup([makeTransaction({ id: 'a', categoryId: 'food' })], categories);
    expect(el.shadowRoot!.querySelector('.subcategory-title')).toBeNull();
    // The item still renders directly under the category group.
    expect(el.shadowRoot!.querySelectorAll('transaction-list-item')).toHaveLength(1);
  });

  it('places each transaction under the correct recurrence + category + subcategory path', () => {
    const el = setup(
      [
        makeTransaction({ id: 'rec-flight', recurrence: 'monthly', categoryId: 'travel', subcategoryId: 'flights' }),
        makeTransaction({ id: 'one-food', recurrence: null, categoryId: 'food' }),
      ],
      categories,
    );
    const recurring = el.shadowRoot!.querySelectorAll('.group')[0]!;
    const oneTime = el.shadowRoot!.querySelectorAll('.group')[1]!;
    expect(recurring.querySelector('.group-title')!.textContent).toBe('Recurring');
    expect(recurring.querySelector('.category-title')!.textContent).toContain('Travel');
    expect(recurring.querySelector('.subcategory-title')!.textContent).toBe('Flights');
    expect(oneTime.querySelector('.group-title')!.textContent).toBe('One-time');
    expect(oneTime.querySelector('.category-title')!.textContent).toContain('Food');
  });
});
