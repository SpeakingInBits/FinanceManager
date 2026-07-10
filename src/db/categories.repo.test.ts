import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { getDb } from './client';
import {
  addCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  getCategory,
} from './categories.repo';
import type { NewCategory } from '@/models/category';

function newCategory(overrides: Partial<NewCategory> = {}): NewCategory {
  return { name: 'Food', type: 'expense', parentId: null, color: '#ff0000', ...overrides };
}

afterEach(async () => {
  const db = await getDb();
  await db.clear('categories');
});

describe('categories.repo', () => {
  it('adds a category and assigns id/createdAt', async () => {
    const created = await addCategory(newCategory());
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Food');
  });

  it('lists all categories', async () => {
    await addCategory(newCategory({ name: 'A' }));
    await addCategory(newCategory({ name: 'B' }));
    expect((await getAllCategories()).map((c) => c.name).sort()).toEqual(['A', 'B']);
  });

  it('fetches a single category by id', async () => {
    const created = await addCategory(newCategory());
    expect(await getCategory(created.id)).toEqual(created);
  });

  it('updates a category', async () => {
    const created = await addCategory(newCategory({ color: '#000' }));
    const updated = await updateCategory(created.id, { color: '#fff' });
    expect(updated.color).toBe('#fff');
    expect(updated.id).toBe(created.id);
  });

  it('throws when updating a missing category', async () => {
    await expect(updateCategory('missing', { color: '#fff' })).rejects.toThrow(
      'Category not found: missing',
    );
  });

  it('deletes a category', async () => {
    const created = await addCategory(newCategory());
    await deleteCategory(created.id);
    expect(await getCategory(created.id)).toBeUndefined();
  });
});
