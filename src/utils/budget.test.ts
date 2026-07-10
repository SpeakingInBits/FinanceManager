import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeBudgetProgress } from './budget';
import type { Budget } from '@/models/budget';
import type { Transaction } from '@/models/transaction';

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Groceries',
    amount: 10000,
    periodType: 'monthly',
    startDate: new Date(2026, 5, 1).getTime(),
    endDate: null,
    categoryId: null,
    createdAt: 0,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'expense',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    budgetId: 'b1',
    note: '',
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('computeBudgetProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sums only expense transactions linked to the budget within the current month', () => {
    const budget = makeBudget();
    const transactions = [
      makeTransaction({ id: 't1', amount: 1000 }),
      makeTransaction({ id: 't2', amount: 2000 }),
      makeTransaction({ id: 't3', amount: 5000, budgetId: 'other-budget' }),
      makeTransaction({ id: 't4', amount: 5000, type: 'income' }),
      makeTransaction({ id: 't5', amount: 5000, date: new Date(2026, 5, 10).getTime() }),
    ];
    const progress = computeBudgetProgress(budget, transactions);
    expect(progress.spent).toBe(3000);
    expect(progress.remaining).toBe(7000);
    expect(progress.over).toBe(false);
  });

  it('flags over-budget spend', () => {
    const budget = makeBudget({ amount: 1000 });
    const transactions = [makeTransaction({ amount: 1500 })];
    const progress = computeBudgetProgress(budget, transactions);
    expect(progress.over).toBe(true);
    expect(progress.remaining).toBe(-500);
  });

  it('computes percent spent', () => {
    const budget = makeBudget({ amount: 1000 });
    const transactions = [makeTransaction({ amount: 250 })];
    expect(computeBudgetProgress(budget, transactions).percent).toBeCloseTo(0.25);
  });

  it('caps percent at 999 for a zero-amount budget with any spend', () => {
    const budget = makeBudget({ amount: 0 });
    const progress = computeBudgetProgress(budget, []);
    expect(progress.percent).toBe(0);
  });

  it('uses the explicit start/end range for one-time budgets', () => {
    const budget = makeBudget({
      periodType: 'one-time',
      startDate: new Date(2026, 0, 1).getTime(),
      endDate: new Date(2026, 2, 31).getTime(),
    });
    const transactions = [
      makeTransaction({ id: 'in-range', amount: 1000, date: new Date(2026, 1, 1).getTime() }),
      makeTransaction({ id: 'out-of-range', amount: 9000, date: new Date(2026, 6, 1).getTime() }),
    ];
    const progress = computeBudgetProgress(budget, transactions);
    expect(progress.spent).toBe(1000);
  });

  it('treats a null endDate as open-ended for one-time budgets', () => {
    const budget = makeBudget({
      periodType: 'one-time',
      startDate: new Date(2026, 0, 1).getTime(),
      endDate: null,
    });
    const transactions = [makeTransaction({ date: new Date(2030, 0, 1).getTime(), amount: 100 })];
    expect(computeBudgetProgress(budget, transactions).spent).toBe(100);
  });
});
