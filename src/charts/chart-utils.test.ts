import { describe, it, expect } from 'vitest';
import { categoryBreakdown, buildSankeyGraph } from './chart-utils';
import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';
import type { Budget } from '@/models/budget';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'expense',
    amount: 1000,
    date: 0,
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

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Food',
    parentId: null,
    color: '#ff0000',
    createdAt: 0,
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Vacation',
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

describe('categoryBreakdown', () => {
  it('aggregates totals per category for the given type', () => {
    const categories = [makeCategory({ id: 'food', name: 'Food', color: '#111' })];
    const transactions = [
      makeTransaction({ categoryId: 'food', amount: 1000 }),
      makeTransaction({ categoryId: 'food', amount: 500 }),
    ];
    const result = categoryBreakdown(transactions, categories, 'expense');
    expect(result).toEqual([{ categoryId: 'food', categoryName: 'Food', total: 1500, color: '#111' }]);
  });

  it('excludes transactions of the other type', () => {
    const transactions = [makeTransaction({ type: 'income', categoryId: 'food' })];
    expect(categoryBreakdown(transactions, [], 'expense')).toEqual([]);
  });

  it('groups uncategorized transactions together', () => {
    const transactions = [
      makeTransaction({ categoryId: null, amount: 300 }),
      makeTransaction({ categoryId: null, amount: 200 }),
    ];
    const result = categoryBreakdown(transactions, [], 'expense');
    expect(result).toEqual([
      { categoryId: 'uncategorized', categoryName: 'Uncategorized', total: 500, color: '#9aa0a6' },
    ]);
  });

  it('falls back to Unknown/gray for a categoryId with no matching category', () => {
    const transactions = [makeTransaction({ categoryId: 'missing', amount: 100 })];
    const result = categoryBreakdown(transactions, [], 'expense');
    expect(result[0]).toEqual({
      categoryId: 'missing',
      categoryName: 'Unknown',
      total: 100,
      color: '#9aa0a6',
    });
  });

  it('sorts slices by total descending', () => {
    const categories = [
      makeCategory({ id: 'a', name: 'A' }),
      makeCategory({ id: 'b', name: 'B' }),
    ];
    const transactions = [
      makeTransaction({ categoryId: 'a', amount: 100 }),
      makeTransaction({ categoryId: 'b', amount: 900 }),
    ];
    const result = categoryBreakdown(transactions, categories, 'expense');
    expect(result.map((s) => s.categoryId)).toEqual(['b', 'a']);
  });
});

describe('buildSankeyGraph', () => {
  it('builds income and expense nodes flowing through a Total node when no budget is linked', () => {
    const categories = [
      makeCategory({ id: 'salary', name: 'Salary' }),
      makeCategory({ id: 'rent', name: 'Rent' }),
    ];
    const transactions = [
      makeTransaction({ type: 'income', categoryId: 'salary', amount: 5000 }),
      makeTransaction({ type: 'expense', categoryId: 'rent', amount: 2000 }),
    ];
    const graph = buildSankeyGraph(transactions, categories, []);
    expect(graph.nodes.map((n) => n.name)).toEqual(['Salary', 'Total', 'Rent']);
    expect(graph.links).toEqual([
      { source: 0, target: 1, value: 5000 },
      { source: 1, target: 2, value: 2000 },
    ]);
  });

  it('omits zero-value links', () => {
    const graph = buildSankeyGraph([], [], []);
    expect(graph.links).toEqual([]);
    expect(graph.nodes.map((n) => n.name)).toEqual(['Total']);
  });

  it('routes income and expense through a budget node when transactions are linked to it', () => {
    const categories = [
      makeCategory({ id: 'salary', name: 'Salary' }),
      makeCategory({ id: 'flights', name: 'Flights' }),
    ];
    const budgets = [makeBudget({ id: 'vacation', name: 'Vacation' })];
    const transactions = [
      makeTransaction({ type: 'income', categoryId: 'salary', amount: 3000, budgetId: 'vacation' }),
      makeTransaction({ type: 'expense', categoryId: 'flights', amount: 1000, budgetId: 'vacation' }),
    ];
    const graph = buildSankeyGraph(transactions, categories, budgets);
    expect(graph.nodes.map((n) => n.name)).toEqual(['Salary', 'Vacation', 'Total', 'Flights']);
    expect(graph.links).toEqual([
      { source: 0, target: 1, value: 3000 },
      { source: 1, target: 3, value: 1000 },
    ]);
  });

  it('excludes budgets with no linked transactions from the node list', () => {
    const budgets = [makeBudget({ id: 'unused', name: 'Unused' })];
    const graph = buildSankeyGraph([], [], budgets);
    expect(graph.nodes.map((n) => n.name)).not.toContain('Unused');
  });
});
