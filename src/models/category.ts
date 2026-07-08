export interface Category {
  id: string;
  name: string;
  /** null = top-level category. */
  parentId: string | null;
  /** Hex color, reused consistently across list swatches and charts. */
  color: string;
  icon?: string;
  /** Sibling display order; falls back to createdAt when unset. */
  order?: number;
  createdAt: number;
}

export type NewCategory = Omit<Category, 'id' | 'createdAt'>;
