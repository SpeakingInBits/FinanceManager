import { getDb } from './client';
import { createId } from '@/utils/id';
import type { Budget, NewBudget } from '@/models/budget';

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDb();
  return db.getAll('budgets');
}

export async function getBudget(id: string): Promise<Budget | undefined> {
  const db = await getDb();
  return db.get('budgets', id);
}

export async function addBudget(input: NewBudget): Promise<Budget> {
  const db = await getDb();
  const budget: Budget = {
    ...input,
    id: createId(),
    createdAt: Date.now(),
  };
  await db.add('budgets', budget);
  return budget;
}

export async function updateBudget(id: string, patch: Partial<NewBudget>): Promise<Budget> {
  const db = await getDb();
  const existing = await db.get('budgets', id);
  if (!existing) {
    throw new Error(`Budget not found: ${id}`);
  }
  const updated: Budget = { ...existing, ...patch, id };
  await db.put('budgets', updated);
  return updated;
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('budgets', id);
}
