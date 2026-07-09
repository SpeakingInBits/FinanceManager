import { appStore } from './app-store';
import * as transactionsRepo from '@/db/transactions.repo';
import * as categoriesRepo from '@/db/categories.repo';
import * as budgetsRepo from '@/db/budgets.repo';
import * as recurringRepo from '@/db/recurring-transactions.repo';
import { setSetting } from '@/db/settings.repo';
import { sortCategories } from '@/utils/category';
import { generateForRules } from '@/utils/recurring';
import { addMonths, monthStart } from '@/utils/date';
import type { NewTransaction } from '@/models/transaction';
import type { NewCategory } from '@/models/category';
import type { NewBudget } from '@/models/budget';
import type { NewRecurringTransaction, RecurringTransaction } from '@/models/recurring-transaction';
import type { ThemeMode } from '@/models/settings';

export async function loadAllData(): Promise<void> {
  const [transactions, categories, budgets, recurringTransactions] = await Promise.all([
    transactionsRepo.getAllTransactions(),
    categoriesRepo.getAllCategories(),
    budgetsRepo.getAllBudgets(),
    recurringRepo.getAllRecurringTransactions(),
  ]);
  const changed = await generateDueRecurring(recurringTransactions);
  appStore.setState({
    transactions: changed ? await transactionsRepo.getAllTransactions() : transactions,
    categories,
    budgets,
    recurringTransactions: changed ? await recurringRepo.getAllRecurringTransactions() : recurringTransactions,
    loaded: true,
  });
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

async function refreshRecurring(): Promise<void> {
  appStore.setState({ recurringTransactions: await recurringRepo.getAllRecurringTransactions() });
}

/** Generates any transactions due for the given rules and persists the results. Returns whether anything changed. */
async function generateDueRecurring(rules: RecurringTransaction[]): Promise<boolean> {
  const { newTransactions, ruleUpdates } = generateForRules(rules, Date.now());
  if (newTransactions.length === 0 && ruleUpdates.length === 0) return false;
  await Promise.all([
    ...newTransactions.map((t) => transactionsRepo.addTransaction(t)),
    ...ruleUpdates.map((u) =>
      recurringRepo.updateRecurringTransaction(u.id, { lastGeneratedThrough: u.lastGeneratedThrough }),
    ),
  ]);
  return true;
}

export async function addTransactionAction(input: NewTransaction): Promise<void> {
  await transactionsRepo.addTransaction(input);
  await refreshTransactions();
}

export async function updateTransactionAction(
  id: string,
  input: NewTransaction,
): Promise<void> {
  await transactionsRepo.updateTransaction(id, input);
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

export async function addRecurringTransactionAction(input: NewRecurringTransaction): Promise<void> {
  const rule = await recurringRepo.addRecurringTransaction(input);
  await generateDueRecurring([rule]);
  await refreshRecurring();
  await refreshTransactions();
}

export async function updateRecurringTransactionAction(
  id: string,
  input: NewRecurringTransaction,
): Promise<void> {
  const existing = await recurringRepo.getRecurringTransaction(id);
  if (!existing) throw new Error(`Recurring transaction not found: ${id}`);

  // Catch the OLD rule up under its own terms first, so the edited terms can never
  // retroactively backfill months that should have used the pre-edit amount/fields.
  await generateDueRecurring([existing]);
  const current = await recurringRepo.getRecurringTransaction(id);
  if (!current) throw new Error(`Recurring transaction not found: ${id}`);

  if (current.lastGeneratedThrough == null) {
    // Nothing has ever been generated for this rule — a plain in-place edit, nothing to preserve.
    await recurringRepo.updateRecurringTransaction(id, input);
  } else {
    const effectiveMonth = addMonths(monthStart(current.lastGeneratedThrough), 1);
    // Patch ONLY endDate — never spread the new fields onto the old rule, or its history would
    // be silently rewritten.
    await recurringRepo.updateRecurringTransaction(id, { endDate: effectiveMonth });
    const newRule = await recurringRepo.addRecurringTransaction({
      ...input,
      startDate: effectiveMonth,
      endDate: null,
      lastGeneratedThrough: null,
      replacesId: id,
    });
    await generateDueRecurring([newRule]);
  }
  await refreshRecurring();
  await refreshTransactions();
}

export async function stopRecurringTransactionAction(id: string): Promise<void> {
  const existing = await recurringRepo.getRecurringTransaction(id);
  if (!existing) throw new Error(`Recurring transaction not found: ${id}`);

  await generateDueRecurring([existing]);
  const current = await recurringRepo.getRecurringTransaction(id);
  if (!current) throw new Error(`Recurring transaction not found: ${id}`);

  const endDate =
    current.lastGeneratedThrough != null
      ? addMonths(monthStart(current.lastGeneratedThrough), 1)
      : current.startDate;
  await recurringRepo.updateRecurringTransaction(id, { endDate });
  await refreshRecurring();
}

export async function deleteRecurringTransactionAction(id: string): Promise<void> {
  await recurringRepo.deleteRecurringTransaction(id);
  await refreshRecurring();
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
