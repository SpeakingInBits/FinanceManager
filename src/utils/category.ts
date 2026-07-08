import type { Category } from '@/models/category';

/** Stable sort by explicit `order` when set, falling back to creation order. */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
}
