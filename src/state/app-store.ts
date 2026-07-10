import { Store } from './store';
import { startOfMonth } from '@/utils/date';
import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';
import type { Budget } from '@/models/budget';
import type { ThemeMode } from '@/models/settings';

export interface AppState {
  route: string;
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  loaded: boolean;
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  /** Epoch millis for the first day of the month currently being viewed (transactions/dashboard). */
  selectedMonth: number;
}

function initialTheme(): { theme: 'light' | 'dark'; themeMode: ThemeMode } {
  const resolved = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const mode = (document.documentElement.dataset.themeMode as ThemeMode) ?? 'system';
  return { theme: resolved, themeMode: mode };
}

export const appStore = new Store<AppState>({
  route: window.location.hash.slice(1) || '/dashboard',
  ...initialTheme(),
  loaded: false,
  transactions: [],
  categories: [],
  budgets: [],
  selectedMonth: startOfMonth(Date.now()),
});
