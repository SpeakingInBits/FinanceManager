import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, type FinanceDB } from './schema';
import type { BudgetPeriodType } from '@/models/budget';
import type { TransactionType } from '@/models/transaction';

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null;

/** Pre-migration (DB_VERSION 1) shape of a budgets record. */
interface LegacyBudgetV1 {
  id: string;
  name: string;
  amount: number;
  periodType: BudgetPeriodType;
  startDate: number;
  endDate: number | null;
  categoryId: string | null;
  createdAt: number;
}

/** Pre-migration (DB_VERSION < 3) shape of a transactions record: no subcategoryId. */
interface LegacyTransactionV2 {
  id: string;
  type: TransactionType;
  amount: number;
  date: number;
  categoryId: string | null;
  budgetId: string | null;
  note: string;
  createdAt: number;
  updatedAt: number;
}

/** Pre-migration (DB_VERSION < 4) shape of a categories record: still has a type field. */
interface LegacyCategoryV3 {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parentId: string | null;
  color: string;
  icon?: string;
  order?: number;
  createdAt: number;
}

export function getDb(): Promise<IDBPDatabase<FinanceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
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
        // Future migrations: if (oldVersion < 6) { ... } — never edit the blocks above.

        if (oldVersion < 2) {
          // Budget.amount was renamed to Budget.targetAmount; rename the field on existing records.
          const store = transaction.objectStore('budgets');
          let cursor = await store.openCursor();
          while (cursor) {
            const record = cursor.value as unknown as LegacyBudgetV1;
            if ('amount' in record) {
              const { amount, ...rest } = record;
              await cursor.update({ ...rest, targetAmount: amount });
            }
            cursor = await cursor.continue();
          }
        }

        if (oldVersion < 3) {
          // Transactions previously stored a subcategory directly in categoryId (the transaction
          // form had one flat select). Split it: categoryId becomes the top-level category, and
          // subcategoryId holds what used to be there if it pointed at a child category.
          const transactions = transaction.objectStore('transactions');
          const categories = transaction.objectStore('categories');
          let cursor = await transactions.openCursor();
          while (cursor) {
            const record = cursor.value as unknown as LegacyTransactionV2;
            const category = record.categoryId ? await categories.get(record.categoryId) : undefined;
            if (category?.parentId) {
              await cursor.update({ ...record, categoryId: category.parentId, subcategoryId: category.id });
            } else if (!('subcategoryId' in record)) {
              await cursor.update({ ...record, subcategoryId: null });
            }
            cursor = await cursor.continue();
          }
        }

        if (oldVersion < 4) {
          // Categories are no longer scoped to income/expense; strip the now-unused type field.
          const store = transaction.objectStore('categories');
          let cursor = await store.openCursor();
          while (cursor) {
            const record = cursor.value as unknown as LegacyCategoryV3;
            if ('type' in record) {
              const { type: _type, ...rest } = record;
              await cursor.update(rest);
            }
            cursor = await cursor.continue();
          }
        }

        if (oldVersion < 5) {
          db.createObjectStore('recurringTransactions', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
