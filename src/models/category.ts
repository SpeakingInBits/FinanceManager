export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  /** null = top-level category. */
  parentId: string | null;
  /** Hex color, reused consistently across list swatches and charts. */
  color: string;
  icon?: string;
  createdAt: number;
}

export type NewCategory = Omit<Category, 'id' | 'createdAt'>;
