import { getDb } from './client';
import { createId } from '@/utils/id';
import type { Category, NewCategory } from '@/models/category';

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.getAll('categories');
}

export async function getCategory(id: string): Promise<Category | undefined> {
  const db = await getDb();
  return db.get('categories', id);
}

export async function addCategory(input: NewCategory): Promise<Category> {
  const db = await getDb();
  const category: Category = {
    ...input,
    id: createId(),
    createdAt: Date.now(),
  };
  await db.add('categories', category);
  return category;
}

export async function updateCategory(
  id: string,
  patch: Partial<NewCategory>,
): Promise<Category> {
  const db = await getDb();
  const existing = await db.get('categories', id);
  if (!existing) {
    throw new Error(`Category not found: ${id}`);
  }
  const updated: Category = { ...existing, ...patch, id };
  await db.put('categories', updated);
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('categories', id);
}
