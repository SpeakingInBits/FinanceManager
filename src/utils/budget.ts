import { monthBounds } from './date';
import type { Budget, BudgetPeriodType } from '@/models/budget';
import type { Transaction } from '@/models/transaction';

export interface BudgetStats {
  periodType: BudgetPeriodType;
  /** Lifetime balance: all-time income linked to this budget minus all-time expense linked to it. Can be negative. */
  balance: number;
  overdrawn: boolean;
  /** Income linked to this budget within the current contribution window. */
  contributed: number;
  target: number;
  /**
   * Amount filling the progress bar toward `target`. Monthly budgets track this window's
   * `contributed` income; one-time budgets track the lifetime `balance` — the money on hand to
   * spend down, so the bar shows how much of the goal is currently funded rather than requiring
   * repeated contributions.
   */
  progress: number;
  /** progress / target, clamped to [0, 999]; 0 when target <= 0. */
  progressPercent: number;
  progressComplete: boolean;
}

/**
 * Computes a budget's all-time spendable balance (income minus expense, unbounded) and its
 * progress toward `targetAmount`. Monthly budgets progress by income contributed within the
 * current calendar month; one-time budgets progress by their lifetime balance across
 * [startDate, endDate ?? Infinity], reflecting funds available to spend down.
 */
export function computeBudgetStats(budget: Budget, transactions: Transaction[]): BudgetStats {
  const [windowStart, windowEnd] =
    budget.periodType === 'monthly' ? monthBounds(Date.now()) : [budget.startDate, budget.endDate ?? Infinity];

  let income = 0;
  let expense = 0;
  let contributed = 0;

  for (const t of transactions) {
    if (t.budgetId !== budget.id) continue;
    if (t.type === 'income') {
      income += t.amount;
      if (t.date >= windowStart && t.date <= windowEnd) contributed += t.amount;
    } else {
      expense += t.amount;
    }
  }

  const balance = income - expense;
  const target = budget.targetAmount;
  const progress = budget.periodType === 'one-time' ? balance : contributed;
  const progressPercent = target > 0 ? Math.max(0, Math.min(progress / target, 999)) : 0;

  return {
    periodType: budget.periodType,
    balance,
    overdrawn: balance < 0,
    contributed,
    target,
    progress,
    progressPercent,
    progressComplete: target > 0 && progress >= target,
  };
}
