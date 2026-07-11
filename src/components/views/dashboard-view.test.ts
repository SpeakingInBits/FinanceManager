import { describe, it, expect, beforeEach } from 'vitest';
import '@/components/transactions/month-nav';
import '@/charts/pie-chart';
import './dashboard-view';
import { appStore } from '@/state/app-store';
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

  it('computes the budgets tile as lifetime income minus expense across all budgets', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 20000, budgetId: 'b1' }),
        makeTransaction({ id: 'b', type: 'expense', amount: 5000, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'budgets-stat')).toBe('$150.00');
  });

  it('sums the budgets tile across multiple budgets', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' }), makeBudget({ id: 'b2', name: 'Emergency Fund' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 10000, budgetId: 'b1' }),
        makeTransaction({ id: 'b', type: 'income', amount: 30000, budgetId: 'b2' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'budgets-stat')).toBe('$400.00');
  });

  it('counts a budget contribution from any month toward the lifetime budgets total', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({
          type: 'income',
          amount: 20000,
          budgetId: 'b1',
          date: new Date(2020, 0, 1).getTime(),
        }),
      ],
    });
    const el = mount();
    expect(stat(el, 'budgets-stat')).toBe('$200.00');
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
