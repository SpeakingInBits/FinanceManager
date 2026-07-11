export type TransactionType = 'income' | 'expense';

export type RecurrenceFrequency = 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Integer minor units (cents) to avoid floating point drift. For recurring transactions, this is the per-occurrence amount (e.g. the full yearly bill), not the monthly-equivalent. */
  amount: number;
  /** Epoch millis. For recurring transactions, the anchor/start date; it recurs on this day-of-month from here on. */
  date: number;
  categoryId: string | null;
  subcategoryId: string | null;
  budgetId: string | null;
  note: string;
  /** null = one-off transaction. */
  recurrence: RecurrenceFrequency | null;
  createdAt: number;
  updatedAt: number;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
