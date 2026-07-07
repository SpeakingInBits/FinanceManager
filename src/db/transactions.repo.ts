import { getDb } from './client';
import { createId } from '@/utils/id';
import type { NewTransaction, Transaction } from '@/models/transaction';

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAll('transactions');
}

export async function getTransactionsByDateRange(
  start: number,
  end: number,
): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllFromIndex('transactions', 'by-date', IDBKeyRange.bound(start, end));
}

export async function getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllFromIndex('transactions', 'by-category', categoryId);
}

export async function getTransactionsByBudget(budgetId: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllFromIndex('transactions', 'by-budget', budgetId);
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const db = await getDb();
  return db.get('transactions', id);
}

export async function addTransaction(input: NewTransaction): Promise<Transaction> {
  const db = await getDb();
  const now = Date.now();
  const transaction: Transaction = {
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('transactions', transaction);
  return transaction;
}

export async function updateTransaction(
  id: string,
  patch: Partial<NewTransaction>,
): Promise<Transaction> {
  const db = await getDb();
  const existing = await db.get('transactions', id);
  if (!existing) {
    throw new Error(`Transaction not found: ${id}`);
  }
  const updated: Transaction = { ...existing, ...patch, id, updatedAt: Date.now() };
  await db.put('transactions', updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('transactions', id);
}
