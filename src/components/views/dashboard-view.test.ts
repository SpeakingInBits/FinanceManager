import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@/components/shared/icon';
import '@/components/shared/empty-state';
import '@/components/shared/modal-dialog';
import '@/components/shared/amount-input';
import '@/components/transactions/month-nav';
import '@/components/budgets/budget-progress-bar';
import '@/components/budgets/budget-card';
import '@/components/budgets/budget-list';
import '@/components/budgets/budget-form';
import '@/charts/pie-chart';
import './dashboard-view';
import { appStore } from '@/state/app-store';
import { AppEvents } from '@/state/events';
import { startOfMonth } from '@/utils/date';
import type { Transaction } from '@/models/transaction';
import type { Budget } from '@/models/budget';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
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

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Vacation Fund',
    targetAmount: 100000,
    periodType: 'monthly',
    startDate: new Date(2020, 0, 1).getTime(),
    endDate: null,
    categoryId: null,
    subcategoryId: null,
    createdAt: 0,
    ...overrides,
  };
}

const july = startOfMonth(new Date(2026, 6, 15).getTime());

function mount(): HTMLElement {
  document.body.innerHTML = '';
  const el = document.createElement('dashboard-view');
  document.body.appendChild(el);
  return el;
}

function stat(el: HTMLElement, className: string): string {
  return el.querySelector(`.${className}`)!.textContent!;
}

beforeEach(() => {
  appStore.setState({ transactions: [], categories: [], budgets: [], selectedMonth: july });
  document.body.innerHTML = '';
});

describe('dashboard-view stat tiles', () => {
  it('sums income and expenses for the selected month, excluding budget-linked transactions', () => {
    appStore.setState({
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 2000 }),
        makeTransaction({ id: 'c', type: 'income', amount: 9999, budgetId: 'b1' }),
        makeTransaction({ id: 'd', type: 'expense', amount: 8888, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$50.00');
    expect(stat(el, 'expense-stat')).toBe('$20.00');
    expect(stat(el, 'net-stat')).toBe('$30.00');
  });

  it('excludes transactions from a different month', () => {
    appStore.setState({
      transactions: [
        makeTransaction({ type: 'income', amount: 5000, date: new Date(2026, 5, 1).getTime() }),
      ],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$0.00');
  });

  it('does not let a budget contribution inflate the regular income tile', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ type: 'income', amount: 20000, budgetId: 'b1' })],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$0.00');
  });

  it('does not let a budget withdrawal inflate the regular expenses tile', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ type: 'expense', amount: 15000, budgetId: 'b1' })],
    });
    const el = mount();
    expect(stat(el, 'expense-stat')).toBe('$0.00');
  });
});

describe('dashboard-view budgets section', () => {
  it('shows an empty state when there are no budgets', () => {
    const el = mount();
    const list = el.querySelector('budget-list')!;
    expect(list.shadowRoot!.querySelector('empty-state')).toBeTruthy();
  });

  it('renders one budget card per budget, not a single combined figure', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1', name: 'Vacation Fund' }), makeBudget({ id: 'b2', name: 'Emergency Fund' })],
    });
    const el = mount();
    const cards = el.querySelector('budget-list')!.shadowRoot!.querySelectorAll('budget-card');
    expect(cards).toHaveLength(2);
    const names = [...cards].map((c) => c.shadowRoot!.querySelector('.name')!.textContent);
    expect(names).toEqual(['Vacation Fund', 'Emergency Fund']);
  });

  it('reflects each budget\'s own lifetime balance on its card', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ type: 'income', amount: 20000, budgetId: 'b1', date: new Date(2020, 0, 1).getTime() }),
        makeTransaction({ type: 'expense', amount: 5000, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    const card = el.querySelector('budget-list')!.shadowRoot!.querySelector('budget-card')!;
    const bar = card.shadowRoot!.querySelector('budget-progress-bar')!;
    expect(bar.shadowRoot!.textContent).toContain('$150.00');
  });

  it('opens the edit modal with the budget prefilled when a card\'s edit button is clicked', () => {
    appStore.setState({ budgets: [makeBudget({ id: 'b1', name: 'Vacation Fund' })] });
    const el = mount();
    const card = el.querySelector('budget-list')!.shadowRoot!.querySelector('budget-card')!;
    (card.shadowRoot!.querySelector('.edit-btn') as HTMLButtonElement).click();
    const dialog = el.querySelector('.budget-modal dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    const form = el.querySelector('budget-form')!;
    expect(form.shadowRoot!.querySelector<HTMLInputElement>('#name')!.value).toBe('Vacation Fund');
  });

  it('deletes a budget after confirmation when a card\'s delete button is clicked', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    appStore.setState({ budgets: [makeBudget({ id: 'b1' })] });
    const el = mount();
    let deletedId: string | undefined;
    el.addEventListener(AppEvents.BudgetDelete, (e) => {
      deletedId = (e as CustomEvent<{ id: string }>).detail.id;
    });
    const card = el.querySelector('budget-list')!.shadowRoot!.querySelector('budget-card')!;
    (card.shadowRoot!.querySelector('.delete-btn') as HTMLButtonElement).click();
    expect(deletedId).toBe('b1');
    vi.restoreAllMocks();
  });
});
