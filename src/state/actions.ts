import { appStore } from './app-store';
import * as transactionsRepo from '@/db/transactions.repo';
import * as categoriesRepo from '@/db/categories.repo';
import * as budgetsRepo from '@/db/budgets.repo';
import { setSetting } from '@/db/settings.repo';
import type { NewTransaction } from '@/models/transaction';
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
