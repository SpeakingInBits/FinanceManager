export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Integer minor units (cents) to avoid floating point drift. */
  amount: number;
  /** Epoch millis. */
  date: number;
  categoryId: string | null;
  budgetId: string | null;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
