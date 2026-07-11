import type { NewBudget } from '@/models/budget';
import type { NewCategory } from '@/models/category';
import type { NewTransaction } from '@/models/transaction';

/** Centralized bubbling CustomEvent names dispatched by components and handled by app-shell. */
export const AppEvents = {
  TransactionSubmit: 'transaction-submit',
  TransactionDelete: 'transaction-delete',
  CategorySubmit: 'category-submit',
  CategoryDelete: 'category-delete',
  BudgetSubmit: 'budget-submit',
  BudgetDelete: 'budget-delete',
  ThemeChange: 'theme-change',
} as const;

export interface TransactionSubmitDetail {
  id?: string;
  input: NewTransaction;
}

export interface TransactionDeleteDetail {
  id: string;
}

export interface CategorySubmitDetail {
  id?: string;
  input: NewCategory;
}

export interface CategoryDeleteDetail {
  id: string;
}

export interface BudgetSubmitDetail {
  id?: string;
  input: NewBudget;
}

export interface BudgetDeleteDetail {
  id: string;
}

export interface ThemeChangeDetail {
  mode: 'system' | 'light' | 'dark';
}
