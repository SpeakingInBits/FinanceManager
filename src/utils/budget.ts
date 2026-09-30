import { monthBounds, startOfMonth } from './date';
import { occurrencesThroughMonth } from './recurrence';
import type { Budget, BudgetPeriodType } from '@/models/budget';
import type { Transaction } from '@/models/transaction';

export interface BudgetStats {
  periodType: BudgetPeriodType;
  /**
   * Lifetime balance: fills (allocations) into this budget minus expense and withdrawals, with
   * recurring transactions counted once per elapsed month through the reference month. Can be
   * negative.
   */
  balance: number;
  overdrawn: boolean;
  /** Money allocated into this budget within the contribution window of the reference month. */
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
 * Computes a budget's spendable balance (fills minus expense) and its progress toward
 * `targetAmount`, as of `referenceMonth` (start-of-month millis; defaults to the current month).
 * Monthly budgets progress by the amount allocated within that month; one-time budgets progress
 * by their lifetime balance across [startDate, endDate ?? Infinity], reflecting funds available
 * to spend down.
 *
 * Recurring transactions count one monthly-equivalent occurrence per month from their anchor
 * month through `referenceMonth`, matching how the dashboard and transaction list project them.
 *
 * Fills are 'allocation' transactions; budget-linked 'income' records (the pre-v7 way of funding
 * a budget) are counted the same way for resilience against unmigrated data. Withdrawals move
 * money back out to general income: like expense, they lower the balance but leave `contributed`
 * (money put in this window) untouched.
 */
export function computeBudgetStats(
  budget: Budget,
  transactions: Transaction[],
  referenceMonth: number = startOfMonth(Date.now()),
): BudgetStats {
  const [windowStart, windowEnd] =
    budget.periodType === 'monthly'
      ? monthBounds(referenceMonth)
      : [budget.startDate, budget.endDate ?? Infinity];

  let funded = 0;
  /** Money leaving the budget: expense paid from it plus withdrawals back to income. */
  let drawn = 0;
  let contributed = 0;

  for (const t of transactions) {
    if (t.budgetId !== budget.id) continue;
    for (const o of occurrencesThroughMonth(t, referenceMonth)) {
      if (t.type === 'expense' || t.type === 'withdrawal') {
        drawn += o.displayAmount;
      } else {
        funded += o.displayAmount;
        if (o.displayDate >= windowStart && o.displayDate <= windowEnd) contributed += o.displayAmount;
      }
    }
  }

  const balance = funded - drawn;
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
