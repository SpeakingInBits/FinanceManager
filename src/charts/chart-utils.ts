import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';
import type { Budget } from '@/models/budget';

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
  /** True for a budget's pass-through node, so it can be rendered distinctly from a plain category. */
  isBudget?: boolean;
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

const BUDGET_NODE_COLOR = '#2f6fed';

/**
 * Builds a cash-flow graph: income sources -> Total -> expense categories for transactions with
 * no linked budget, and income sources -> budget -> expense categories for transactions linked
 * to a budget (contributions flow in, spending flows out of the budget's balance).
 */
export function buildSankeyGraph(
  transactions: Transaction[],
  categories: Category[],
  budgets: Budget[],
): SankeyGraph {
  const income = categoryBreakdown(transactions, categories, 'income');
  const expense = categoryBreakdown(transactions, categories, 'expense');
  const incomeIndex = new Map(income.map((s, i) => [s.categoryId, i]));
  const expenseIndex = new Map(expense.map((s, i) => [s.categoryId, i]));
  const budgetById = new Map(budgets.map((b) => [b.id, b]));

  const incomeToTotal = new Map<string, number>();
  const incomeToBudget = new Map<string, Map<string, number>>();
  const totalToExpense = new Map<string, number>();
  const budgetToExpense = new Map<string, Map<string, number>>();
  const activeBudgetIds = new Set<string>();

  for (const t of transactions) {
    const key = t.categoryId ?? 'uncategorized';
    const linkedBudget = t.budgetId ? budgetById.get(t.budgetId) : undefined;

    if (t.type === 'income') {
      if (linkedBudget) {
        activeBudgetIds.add(linkedBudget.id);
        const byBudget = incomeToBudget.get(key) ?? new Map<string, number>();
        byBudget.set(linkedBudget.id, (byBudget.get(linkedBudget.id) ?? 0) + t.amount);
        incomeToBudget.set(key, byBudget);
      } else {
        incomeToTotal.set(key, (incomeToTotal.get(key) ?? 0) + t.amount);
      }
    } else if (t.type === 'expense') {
      if (linkedBudget) {
        activeBudgetIds.add(linkedBudget.id);
        const byCategory = budgetToExpense.get(linkedBudget.id) ?? new Map<string, number>();
        byCategory.set(key, (byCategory.get(key) ?? 0) + t.amount);
        budgetToExpense.set(linkedBudget.id, byCategory);
      } else {
        totalToExpense.set(key, (totalToExpense.get(key) ?? 0) + t.amount);
      }
    }
  }

  const activeBudgets = budgets.filter((b) => activeBudgetIds.has(b.id));
  const budgetIndex = new Map(activeBudgets.map((b, i) => [b.id, i]));

  const budgetOffset = income.length;
  const totalIndex = income.length + activeBudgets.length;
  const expenseOffset = totalIndex + 1;

  const nodes: SankeyNodeDatum[] = [
    ...income.map((s) => ({ name: s.categoryName, color: s.color })),
    ...activeBudgets.map((b) => ({ name: b.name, color: BUDGET_NODE_COLOR, isBudget: true })),
    { name: 'Total', color: '#9aa0a6' },
    ...expense.map((s) => ({ name: s.categoryName, color: s.color })),
  ];

  const links: SankeyLinkDatum[] = [];

  for (const [key, value] of incomeToTotal) {
    if (value > 0) links.push({ source: incomeIndex.get(key)!, target: totalIndex, value });
  }
  for (const [key, byBudget] of incomeToBudget) {
    for (const [budgetId, value] of byBudget) {
      if (value > 0) {
        links.push({ source: incomeIndex.get(key)!, target: budgetOffset + budgetIndex.get(budgetId)!, value });
      }
    }
  }
  for (const [key, value] of totalToExpense) {
    if (value > 0) links.push({ source: totalIndex, target: expenseOffset + expenseIndex.get(key)!, value });
  }
  for (const [budgetId, byCategory] of budgetToExpense) {
    for (const [key, value] of byCategory) {
      if (value > 0) {
        links.push({
          source: budgetOffset + budgetIndex.get(budgetId)!,
          target: expenseOffset + expenseIndex.get(key)!,
          value,
        });
      }
    }
  }

  return { nodes, links };
}

const NO_SUBCATEGORY = '__none__';

export interface CategorySubSlice {
  key: string;
  categoryId: string;
  subcategoryId: string | null;
  label: string;
  total: number;
  color: string;
}

export interface CategoryGroupSlice {
  categoryId: string;
  categoryName: string;
  color: string;
  total: number;
  /** One slice per subcategory in use, plus an "Other" bucket for direct (no-subcategory)
   * transactions when subcategories are also in use; a single slice (no split) otherwise. */
  slices: CategorySubSlice[];
}

/**
 * Like categoryBreakdown, but further splits each category into its subcategories for pie-chart
 * drilldown: transactions with no subcategory fall into an "Other" bucket once real subcategories
 * are also present for that category, otherwise the category gets a single unsplit slice.
 */
export function categoryBreakdownBySubcategory(
  transactions: Transaction[],
  categories: Category[],
  type: Transaction['type'],
): CategoryGroupSlice[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const byCategory = new Map<string, Map<string, number>>();

  for (const t of transactions) {
    if (t.type !== type) continue;
    const catKey = t.categoryId ?? 'uncategorized';
    const subKey = t.subcategoryId ?? NO_SUBCATEGORY;
    const bySub = byCategory.get(catKey) ?? new Map<string, number>();
    bySub.set(subKey, (bySub.get(subKey) ?? 0) + t.amount);
    byCategory.set(catKey, bySub);
  }

  const groups: CategoryGroupSlice[] = [];
  for (const [catId, bySub] of byCategory) {
    const category = catId === 'uncategorized' ? undefined : byId.get(catId);
    const categoryName = catId === 'uncategorized' ? 'Uncategorized' : (category?.name ?? 'Unknown');
    const baseColor = catId === 'uncategorized' ? UNCATEGORIZED_COLOR : (category?.color ?? UNCATEGORIZED_COLOR);

    const subEntries = [...bySub.entries()]
      .map(([subKey, total]) => ({ subcategoryId: subKey === NO_SUBCATEGORY ? null : subKey, total }))
      .sort((a, b) => b.total - a.total);

    const categoryTotal = subEntries.reduce((sum, e) => sum + e.total, 0);

    const slices: CategorySubSlice[] = subEntries.map((entry) => {
      const subcategory = entry.subcategoryId ? byId.get(entry.subcategoryId) : undefined;
      const label = entry.subcategoryId
        ? (subcategory?.name ?? 'Unknown')
        : subEntries.length > 1
          ? 'Other'
          : categoryName;
      return {
        key: `${catId}:${entry.subcategoryId ?? 'none'}`,
        categoryId: catId,
        subcategoryId: entry.subcategoryId,
        label,
        total: entry.total,
        // Each subcategory carries its own assigned color, the same one shown on its list swatch.
        // The "Other" bucket and unsplit categories have no subcategory of their own, so they take
        // the parent category's color.
        color: subcategory?.color ?? baseColor,
      };
    });

    groups.push({ categoryId: catId, categoryName, color: baseColor, total: categoryTotal, slices });
  }

  return groups.sort((a, b) => b.total - a.total);
}
