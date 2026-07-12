import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeBudgetStats } from './budget';
import type { Budget } from '@/models/budget';
import type { Transaction } from '@/models/transaction';

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Groceries',
    targetAmount: 10000,
    periodType: 'monthly',
    startDate: new Date(2026, 5, 1).getTime(),
    endDate: null,
    categoryId: null,
    subcategoryId: null,
    createdAt: 0,
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'income',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    subcategoryId: null,
    budgetId: 'b1',
    note: '',
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('computeBudgetStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sums only income transactions linked to the budget within the current month as contributed', () => {
    const budget = makeBudget();
    const transactions = [
      makeTransaction({ id: 't1', amount: 1000 }),
      makeTransaction({ id: 't2', amount: 2000 }),
      makeTransaction({ id: 't3', amount: 5000, budgetId: 'other-budget' }),
      makeTransaction({ id: 't4', amount: 5000, type: 'expense' }),
      makeTransaction({ id: 't5', amount: 5000, date: new Date(2026, 5, 10).getTime() }),
    ];
    const stats = computeBudgetStats(budget, transactions);
    expect(stats.contributed).toBe(3000);
  });

  it('computes lifetime balance as all-time income minus all-time expense, ignoring the window', () => {
    const budget = makeBudget();
    const transactions = [
      makeTransaction({ type: 'income', amount: 1000, date: new Date(2020, 0, 1).getTime() }),
      makeTransaction({ type: 'income', amount: 500 }),
      makeTransaction({ type: 'expense', amount: 300 }),
    ];
    const stats = computeBudgetStats(budget, transactions);
    expect(stats.balance).toBe(1200);
    expect(stats.overdrawn).toBe(false);
  });

  it('flags overdrawn when lifetime expense exceeds lifetime income', () => {
    const budget = makeBudget();
    const transactions = [
      makeTransaction({ type: 'income', amount: 500 }),
      makeTransaction({ type: 'expense', amount: 800 }),
    ];
    const stats = computeBudgetStats(budget, transactions);
    expect(stats.balance).toBe(-300);
    expect(stats.overdrawn).toBe(true);
  });

  it('ignores transactions linked to a different budget for balance too', () => {
    const budget = makeBudget();
    const transactions = [makeTransaction({ type: 'income', amount: 9000, budgetId: 'other-budget' })];
    expect(computeBudgetStats(budget, transactions).balance).toBe(0);
  });

  it('progresses monthly budgets by contributed income against the target', () => {
    const budget = makeBudget({ targetAmount: 1000 });
    const transactions = [makeTransaction({ amount: 250 })];
    const stats = computeBudgetStats(budget, transactions);
    expect(stats.progress).toBe(250);
    expect(stats.progressPercent).toBeCloseTo(0.25);
  });

  it('reports progress complete once a monthly budget reaches the target', () => {
    const budget = makeBudget({ targetAmount: 1000 });
    const transactions = [makeTransaction({ amount: 1000 })];
    expect(computeBudgetStats(budget, transactions).progressComplete).toBe(true);
  });

  it('does not report progress complete when under target', () => {
    const budget = makeBudget({ targetAmount: 1000 });
    const transactions = [makeTransaction({ amount: 999 })];
    expect(computeBudgetStats(budget, transactions).progressComplete).toBe(false);
  });

  it('caps progress percent at 999 and reports 0 for a zero-target budget', () => {
    const budget = makeBudget({ targetAmount: 0 });
    const stats = computeBudgetStats(budget, []);
    expect(stats.progressPercent).toBe(0);
    expect(stats.progressComplete).toBe(false);
  });

  it('progresses one-time budgets by lifetime balance rather than windowed contributions', () => {
    const budget = makeBudget({
      periodType: 'one-time',
      targetAmount: 10000,
      startDate: new Date(2026, 0, 1).getTime(),
      endDate: null,
    });
    const transactions = [
      makeTransaction({ id: 'fund', type: 'income', amount: 10000, date: new Date(2026, 1, 1).getTime() }),
      makeTransaction({ id: 'spend', type: 'expense', amount: 4000, date: new Date(2026, 3, 1).getTime() }),
    ];
    const stats = computeBudgetStats(budget, transactions);
    // Balance on hand is 6000 of the 10000 goal: the bar shows funds available, not each contribution.
    expect(stats.progress).toBe(6000);
    expect(stats.progressPercent).toBeCloseTo(0.6);
    expect(stats.progressComplete).toBe(false);
  });

  it('reports a one-time budget complete when its balance covers the target', () => {
    const budget = makeBudget({ periodType: 'one-time', targetAmount: 10000, endDate: null });
    const transactions = [makeTransaction({ type: 'income', amount: 10000 })];
    expect(computeBudgetStats(budget, transactions).progressComplete).toBe(true);
  });

  it('clamps one-time progress percent to 0 when the budget is overdrawn', () => {
    const budget = makeBudget({ periodType: 'one-time', targetAmount: 10000, endDate: null });
    const transactions = [makeTransaction({ type: 'expense', amount: 500 })];
    const stats = computeBudgetStats(budget, transactions);
    expect(stats.progress).toBe(-500);
    expect(stats.progressPercent).toBe(0);
    expect(stats.overdrawn).toBe(true);
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
    const stats = computeBudgetStats(budget, transactions);
    expect(stats.contributed).toBe(1000);
  });

  it('treats a null endDate as open-ended for one-time budgets', () => {
    const budget = makeBudget({
      periodType: 'one-time',
      startDate: new Date(2026, 0, 1).getTime(),
      endDate: null,
    });
    const transactions = [makeTransaction({ date: new Date(2030, 0, 1).getTime(), amount: 100 })];
    expect(computeBudgetStats(budget, transactions).contributed).toBe(100);
  });
});
