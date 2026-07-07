import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';

export interface CategorySlice {
  categoryId: string;
  categoryName: string;
  total: number;
  color: string;
}

const UNCATEGORIZED_COLOR = '#9aa0a6';

/** Aggregates transactions of a given type into per-category totals for the pie chart. */
export function categoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  type: Transaction['type'],
): CategorySlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();

  for (const t of transactions) {
    if (t.type !== type) continue;
    const key = t.categoryId ?? 'uncategorized';
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }

  return [...totals.entries()]
    .map(([id, total]) => ({
      categoryId: id,
      categoryName: id === 'uncategorized' ? 'Uncategorized' : (byId.get(id)?.name ?? 'Unknown'),
      total,
      color: id === 'uncategorized' ? UNCATEGORIZED_COLOR : (byId.get(id)?.color ?? UNCATEGORIZED_COLOR),
    }))
    .sort((a, b) => b.total - a.total);
}

export interface SankeyNodeDatum {
  name: string;
  color: string;
}

export interface SankeyLinkDatum {
  source: number;
  target: number;
  value: number;
}

export interface SankeyGraph {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
}

/** Builds an income-sources -> Total -> expense-categories cash-flow graph. */
export function buildSankeyGraph(transactions: Transaction[], categories: Category[]): SankeyGraph {
  const income = categoryBreakdown(transactions, categories, 'income');
  const expense = categoryBreakdown(transactions, categories, 'expense');

  const nodes: SankeyNodeDatum[] = [
    ...income.map((s) => ({ name: s.categoryName, color: s.color })),
    { name: 'Total', color: '#9aa0a6' },
    ...expense.map((s) => ({ name: s.categoryName, color: s.color })),
  ];

  const totalIndex = income.length;
  const links: SankeyLinkDatum[] = [
    ...income.map((s, i) => ({ source: i, target: totalIndex, value: s.total })),
    ...expense.map((s, i) => ({ source: totalIndex, target: totalIndex + 1 + i, value: s.total })),
  ].filter((link) => link.value > 0);

  return { nodes, links };
}
