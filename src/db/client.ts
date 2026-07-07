import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, type FinanceDB } from './schema';

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FinanceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const transactions = db.createObjectStore('transactions', { keyPath: 'id' });
          transactions.createIndex('by-date', 'date');
          transactions.createIndex('by-category', 'categoryId');
          transactions.createIndex('by-budget', 'budgetId');
          transactions.createIndex('by-type', 'type');

          const categories = db.createObjectStore('categories', { keyPath: 'id' });
          categories.createIndex('by-parent', 'parentId');
          categories.createIndex('by-type', 'type');

          const budgets = db.createObjectStore('budgets', { keyPath: 'id' });
          budgets.createIndex('by-category', 'categoryId');
          budgets.createIndex('by-period', 'periodType');

          db.createObjectStore('settings', { keyPath: 'key' });
        }
        // Future migrations: if (oldVersion < 2) { ... } — never edit the block above.
      },
    });
  }
  return dbPromise;
}
