import type { DBSchema } from 'idb';
import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';
import type { Budget } from '@/models/budget';

export const DB_NAME = 'finance-tracker-db';
export const DB_VERSION = 5;

export interface FinanceDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-date': number;
      'by-category': string;
      'by-budget': string;
      'by-type': string;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: {
      'by-parent': string;
      'by-type': string;
    };
  };
  budgets: {
    key: string;
    value: Budget;
    indexes: {
      'by-category': string;
      'by-period': string;
    };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
}
