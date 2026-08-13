import { appStore } from './app-store';
import * as transactionsRepo from '@/db/transactions.repo';
import * as categoriesRepo from '@/db/categories.repo';
import * as budgetsRepo from '@/db/budgets.repo';
import { setSetting } from '@/db/settings.repo';
import { sortCategories } from '@/utils/category';
import { startOfMonth } from '@/utils/date';
import { projectDayIntoMonth } from '@/utils/recurrence';
import type { NewTransaction, Transaction } from '@/models/transaction';
import type { NewCategory } from '@/models/category';
import type { NewBudget } from '@/models/budget';
import type { ThemeMode } from '@/models/settings';

export async function loadAllData(): Promise<void> {
  const [transactions, categories, budgets] = await Promise.all([
    transactionsRepo.getAllTransactions(),
    categoriesRepo.getAllCategories(),
    budgetsRepo.getAllBudgets(),
  ]);
  appStore.setState({ transactions, categories, budgets, loaded: true });
}

async function refreshTransactions(): Promise<void> {
  appStore.setState({ transactions: await transactionsRepo.getAllTransactions() });
}

async function refreshCategories(): Promise<void> {
  appStore.setState({ categories: await categoriesRepo.getAllCategories() });
}

async function refreshBudgets(): Promise<void> {
  appStore.setState({ budgets: await budgetsRepo.getAllBudgets() });
}

export async function addTransactionAction(input: NewTransaction): Promise<void> {
  await transactionsRepo.addTransaction(input);
  await refreshTransactions();
}

/**
 * The month a history-rewriting edit to a recurring transaction should take effect from, or null
 * when the edit can be applied in place. Amount and recurrence-frequency changes describe a new
 * going-forward reality, so they take effect from the later of the viewed month and the submitted
 * date's month; earlier months must keep the old values. There is nothing to preserve when the
 * effective month is the anchor month (no earlier occurrences) or when the recurrence already
 * ended before it.
 */
function recurringSplitMonth(existing: Transaction, input: NewTransaction): number | null {
  if (existing.recurrence === null) return null;
  if (input.amount === existing.amount && input.recurrence === existing.recurrence) return null;
  const effectiveMonth = Math.max(
    startOfMonth(appStore.getState().selectedMonth),
    startOfMonth(input.date),
  );
  if (effectiveMonth <= startOfMonth(existing.date)) return null;
  if (existing.recurrenceEnd !== null && effectiveMonth >= existing.recurrenceEnd) return null;
  return effectiveMonth;
}

export async function updateTransactionAction(
  id: string,
  input: NewTransaction,
): Promise<void> {
  const existing = await transactionsRepo.getTransaction(id);
  const splitMonth = existing ? recurringSplitMonth(existing, input) : null;
  if (existing && splitMonth !== null) {
    // Preserve history: close the old record just before the effective month (all its other
    // fields untouched) and carry the edit forward as a new record anchored in that month.
    await transactionsRepo.updateTransaction(id, { recurrenceEnd: splitMonth });
    await transactionsRepo.addTransaction({
      ...input,
      date: projectDayIntoMonth(input.date, splitMonth),
      recurrenceEnd: input.recurrence === null ? null : existing.recurrenceEnd,
    });
  } else {
    await transactionsRepo.updateTransaction(id, input);
  }
  await refreshTransactions();
}

export async function deleteTransactionAction(id: string): Promise<void> {
  await transactionsRepo.deleteTransaction(id);
  await refreshTransactions();
}

export async function addCategoryAction(input: NewCategory): Promise<void> {
  await categoriesRepo.addCategory(input);
  await refreshCategories();
}

export async function updateCategoryAction(id: string, input: NewCategory): Promise<void> {
  await categoriesRepo.updateCategory(id, input);
  await refreshCategories();
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await categoriesRepo.deleteCategory(id);
  await refreshCategories();
}

export async function moveCategoryAction(id: string, direction: 'up' | 'down'): Promise<void> {
  const { categories } = appStore.getState();
  const target = categories.find((c) => c.id === id);
  if (!target) return;

  const siblings = sortCategories(categories.filter((c) => c.parentId === target.parentId));
  const index = siblings.findIndex((c) => c.id === id);
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= siblings.length) return;

  const needsNormalization = siblings.some((c) => c.order === undefined);
  const orders = needsNormalization ? siblings.map((_, i) => i) : siblings.map((c) => c.order!);

  const updates = new Map<string, number>();
  if (needsNormalization) {
    siblings.forEach((c, i) => updates.set(c.id, orders[i]!));
  }
  updates.set(siblings[index]!.id, orders[neighborIndex]!);
  updates.set(siblings[neighborIndex]!.id, orders[index]!);

  await Promise.all(
    [...updates.entries()].map(([catId, order]) => categoriesRepo.updateCategory(catId, { order })),
  );
  await refreshCategories();
}

export async function addBudgetAction(input: NewBudget): Promise<void> {
  await budgetsRepo.addBudget(input);
  await refreshBudgets();
}

export async function updateBudgetAction(id: string, input: NewBudget): Promise<void> {
  await budgetsRepo.updateBudget(id, input);
  await refreshBudgets();
}

export async function deleteBudgetAction(id: string): Promise<void> {
  await budgetsRepo.deleteBudget(id);
  await refreshBudgets();
}

export function setSelectedMonthAction(millis: number): void {
  appStore.setState({ selectedMonth: millis });
}

export async function setThemeModeAction(mode: ThemeMode): Promise<void> {
  const resolved =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeMode = mode;
  if (mode === 'system') {
    localStorage.removeItem('theme');
  } else {
    localStorage.setItem('theme', mode);
  }
  appStore.setState({ theme: resolved, themeMode: mode });
  await setSetting('themeMode', mode);
}
