import { getDb } from './client';
import { createId } from '@/utils/id';
import type { NewRecurringTransaction, RecurringTransaction } from '@/models/recurring-transaction';

export async function getAllRecurringTransactions(): Promise<RecurringTransaction[]> {
  const db = await getDb();
  return db.getAll('recurringTransactions');
}

export async function getRecurringTransaction(id: string): Promise<RecurringTransaction | undefined> {
  const db = await getDb();
  return db.get('recurringTransactions', id);
}

export async function addRecurringTransaction(
  input: NewRecurringTransaction,
): Promise<RecurringTransaction> {
  const db = await getDb();
  const rule: RecurringTransaction = {
    ...input,
    id: createId(),
    createdAt: Date.now(),
  };
  await db.add('recurringTransactions', rule);
  return rule;
}

export async function updateRecurringTransaction(
  id: string,
  patch: Partial<NewRecurringTransaction>,
): Promise<RecurringTransaction> {
  const db = await getDb();
  const existing = await db.get('recurringTransactions', id);
  if (!existing) {
    throw new Error(`Recurring transaction not found: ${id}`);
  }
  const updated: RecurringTransaction = { ...existing, ...patch, id };
  await db.put('recurringTransactions', updated);
  return updated;
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('recurringTransactions', id);
}
