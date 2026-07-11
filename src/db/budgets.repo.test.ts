import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { getDb } from './client';
import { addBudget, updateBudget, deleteBudget, getAllBudgets, getBudget } from './budgets.repo';
import type { NewBudget } from '@/models/budget';

function newBudget(overrides: Partial<NewBudget> = {}): NewBudget {
  return {
    name: 'Groceries',
    targetAmount: 10000,
    periodType: 'monthly',
    startDate: new Date(2026, 0, 1).getTime(),
    endDate: null,
    categoryId: null,
    subcategoryId: null,
    ...overrides,
  };
}

afterEach(async () => {
  const db = await getDb();
  await db.clear('budgets');
});

describe('budgets.repo', () => {
  it('adds a budget and assigns id/createdAt', async () => {
    const created = await addBudget(newBudget());
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Groceries');
  });

  it('lists all budgets', async () => {
    await addBudget(newBudget({ name: 'A' }));
    await addBudget(newBudget({ name: 'B' }));
    expect((await getAllBudgets()).map((b) => b.name).sort()).toEqual(['A', 'B']);
  });

  it('fetches a single budget by id', async () => {
    const created = await addBudget(newBudget());
    expect(await getBudget(created.id)).toEqual(created);
  });

  it('updates a budget', async () => {
    const created = await addBudget(newBudget({ targetAmount: 10000 }));
    const updated = await updateBudget(created.id, { targetAmount: 20000 });
    expect(updated.targetAmount).toBe(20000);
  });

  it('throws when updating a missing budget', async () => {
    await expect(updateBudget('missing', { targetAmount: 1 })).rejects.toThrow(
      'Budget not found: missing',
    );
  });

  it('deletes a budget', async () => {
    const created = await addBudget(newBudget());
    await deleteBudget(created.id);
    expect(await getBudget(created.id)).toBeUndefined();
  });
});
