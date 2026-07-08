import { monthBounds } from './date';
import type { Budget } from '@/models/budget';
import type { Transaction } from '@/models/transaction';

export interface BudgetStats {
  /** All-time income linked to this budget minus all-time expense linked to it. Can be negative. */
  balance: number;
  overdrawn: boolean;
  /** Income linked to this budget within the current contribution window. */
  contributed: number;
  target: number;
  /** contributed / target, clamped; 0 when target <= 0. */
  contributionPercent: number;
  contributionComplete: boolean;
}

/**
 * Computes a budget's all-time spendable balance (income minus expense, unbounded) and its
 * contribution progress toward `targetAmount` within the active window: the current calendar
 * month for 'monthly' budgets, or [startDate, endDate ?? Infinity] for 'one-time' budgets.
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
  const contributionPercent = target > 0 ? Math.min(contributed / target, 999) : 0;

  return {
    balance,
    overdrawn: balance < 0,
    contributed,
    target,
    contributionPercent,
    contributionComplete: target > 0 && contributed >= target,
  };
}
