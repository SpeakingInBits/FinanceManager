import type { TransactionType } from './transaction';

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  /** Integer minor units (cents). */
  amount: number;
  categoryId: string | null;
  subcategoryId: string | null;
  budgetId: string | null;
  note: string;
  /** 1-31; clamped to the actual last day of a given month when generating. */
  dayOfMonth: number;
  /** Epoch millis, month-start: first month this rule is active. */
  startDate: number;
  /** Epoch millis, month-start: generates for months before this; null = open-ended. */
  endDate: number | null;
  /** Epoch millis, month-start of the most recent month generated; null = never generated. */
  lastGeneratedThrough: number | null;
  /** Previous-version rule this one supersedes, if it was created by editing an amount/field. */
  replacesId: string | null;
  createdAt: number;
}

export type NewRecurringTransaction = Omit<RecurringTransaction, 'id' | 'createdAt'>;
