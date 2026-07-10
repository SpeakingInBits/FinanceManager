import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { getDb } from './client';
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getAllTransactions,
  getTransaction,
  getTransactionsByDateRange,
  getTransactionsByCategory,
  getTransactionsByBudget,
} from './transactions.repo';
import type { NewTransaction } from '@/models/transaction';

function newTransaction(overrides: Partial<NewTransaction> = {}): NewTransaction {
  return {
    type: 'expense',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    budgetId: null,
    note: '',
    recurrence: null,
    ...overrides,
  };
}

afterEach(async () => {
  const db = await getDb();
  await db.clear('transactions');
});

describe('transactions.repo', () => {
  it('adds a transaction and assigns id/createdAt/updatedAt', async () => {
    const created = await addTransaction(newTransaction({ note: 'Coffee' }));
    expect(created.id).toBeTruthy();
    expect(created.note).toBe('Coffee');
    expect(created.createdAt).toBe(created.updatedAt);
    expect(typeof created.createdAt).toBe('number');
  });

  it('retrieves all transactions', async () => {
    await addTransaction(newTransaction({ note: 'a' }));
    await addTransaction(newTransaction({ note: 'b' }));
    const all = await getAllTransactions();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.note).sort()).toEqual(['a', 'b']);
  });

  it('retrieves a single transaction by id', async () => {
    const created = await addTransaction(newTransaction());
    const fetched = await getTransaction(created.id);
    expect(fetched).toEqual(created);
  });

  it('returns undefined for a missing transaction id', async () => {
    expect(await getTransaction('does-not-exist')).toBeUndefined();
  });

  it('updates an existing transaction and bumps updatedAt', async () => {
    const created = await addTransaction(newTransaction({ amount: 1000 }));
    const before = created.updatedAt;
    await new Promise((r) => setTimeout(r, 2));
    const updated = await updateTransaction(created.id, { amount: 2000 });
    expect(updated.amount).toBe(2000);
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBeGreaterThan(before);
  });

  it('throws when updating a transaction that does not exist', async () => {
    await expect(updateTransaction('missing-id', { amount: 1 })).rejects.toThrow(
      'Transaction not found: missing-id',
    );
  });

  it('deletes a transaction', async () => {
    const created = await addTransaction(newTransaction());
    await deleteTransaction(created.id);
    expect(await getTransaction(created.id)).toBeUndefined();
  });

  it('queries transactions within a date range via the by-date index', async () => {
    const inRange = await addTransaction(newTransaction({ date: new Date(2026, 6, 15).getTime() }));
    await addTransaction(newTransaction({ date: new Date(2026, 5, 15).getTime() }));
    const [start, end] = [new Date(2026, 6, 1).getTime(), new Date(2026, 6, 31, 23, 59, 59, 999).getTime()];
    const result = await getTransactionsByDateRange(start, end);
    expect(result.map((t) => t.id)).toEqual([inRange.id]);
  });

  it('queries transactions by category via the by-category index', async () => {
    const match = await addTransaction(newTransaction({ categoryId: 'cat-1' }));
    await addTransaction(newTransaction({ categoryId: 'cat-2' }));
    const result = await getTransactionsByCategory('cat-1');
    expect(result.map((t) => t.id)).toEqual([match.id]);
  });

  it('queries transactions by budget via the by-budget index', async () => {
    const match = await addTransaction(newTransaction({ budgetId: 'budget-1' }));
    await addTransaction(newTransaction({ budgetId: 'budget-2' }));
    const result = await getTransactionsByBudget('budget-1');
    expect(result.map((t) => t.id)).toEqual([match.id]);
  });

  it('persists the recurrence field', async () => {
    const created = await addTransaction(newTransaction({ recurrence: 'yearly', amount: 120000 }));
    const fetched = await getTransaction(created.id);
    expect(fetched?.recurrence).toBe('yearly');
  });
});
