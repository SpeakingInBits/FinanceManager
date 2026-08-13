/**
 * 'income' — money earned (a paycheck); never linked to a budget.
 * 'expense' — money spent; deducts from a budget when linked to one.
 * 'allocation' — a budget fill: moves money from already-logged income into a budget.
 *   Always linked to a budget and carries no category.
 */
export type TransactionType = 'income' | 'expense' | 'allocation';

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
  /**
   * Start-of-month epoch millis of the first month this recurrence no longer occurs in
   * (exclusive end); null = recurs indefinitely. Always null for one-offs. Set when an edit to a
   * recurring transaction is carried forward as a new record so earlier months keep their history.
   */
  recurrenceEnd: number | null;
  createdAt: number;
  updatedAt: number;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
