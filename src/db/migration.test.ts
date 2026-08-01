import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { describe, it, expect } from 'vitest';
import { DB_NAME } from './schema';

/** Seeds a v6 database (the pre-allocation schema) so getDb() runs only the v7 migration. */
async function seedV6Db(): Promise<void> {
  const db = await openDB(DB_NAME, 6, {
    upgrade(database) {
      const transactions = database.createObjectStore('transactions', { keyPath: 'id' });
      transactions.createIndex('by-date', 'date');
      transactions.createIndex('by-category', 'categoryId');
      transactions.createIndex('by-budget', 'budgetId');
      transactions.createIndex('by-type', 'type');

      const categories = database.createObjectStore('categories', { keyPath: 'id' });
      categories.createIndex('by-parent', 'parentId');
      categories.createIndex('by-type', 'type');

      const budgets = database.createObjectStore('budgets', { keyPath: 'id' });
      budgets.createIndex('by-category', 'categoryId');
      budgets.createIndex('by-period', 'periodType');

      database.createObjectStore('settings', { keyPath: 'key' });
    },
  });

  const base = {
    amount: 1000,
    date: 1,
    subcategoryId: null,
    note: '',
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
  };
  await db.put('transactions', { ...base, id: 'fill', type: 'income', categoryId: 'salary', budgetId: 'b1' });
  await db.put('transactions', { ...base, id: 'pay', type: 'income', categoryId: 'salary', budgetId: null });
  await db.put('transactions', { ...base, id: 'spend', type: 'expense', categoryId: 'food', budgetId: 'b1' });
  db.close();
}

describe('v7 migration', () => {
  it('converts budget-linked income into category-less allocations, leaving other records alone', async () => {
    await seedV6Db();

    // Imported after seeding so getDb() opens the existing v6 database and upgrades it.
    const { getDb } = await import('./client');
    const db = await getDb();

    const fill = await db.get('transactions', 'fill');
    expect(fill).toMatchObject({
      type: 'allocation',
      budgetId: 'b1',
      categoryId: null,
      subcategoryId: null,
      amount: 1000,
    });

    const pay = await db.get('transactions', 'pay');
    expect(pay).toMatchObject({ type: 'income', categoryId: 'salary', budgetId: null });

    const spend = await db.get('transactions', 'spend');
    expect(spend).toMatchObject({ type: 'expense', categoryId: 'food', budgetId: 'b1' });
  });
});
