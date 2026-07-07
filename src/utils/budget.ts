import { monthBounds } from './date';
import type { Budget } from '@/models/budget';
import type { Transaction } from '@/models/transaction';

export interface BudgetProgress {
  spent: number;
  remaining: number;
  percent: number;
  over: boolean;
}

/** Sums expense transactions linked to this budget within its current active period. */
export function computeBudgetProgress(budget: Budget, transactions: Transaction[]): BudgetProgress {
  const [periodStart, periodEnd] =
    budget.periodType === 'monthly' ? monthBounds(Date.now()) : [budget.startDate, budget.endDate ?? Infinity];

  const spent = transactions
    .filter(
      (t) =>
        t.budgetId === budget.id &&
        t.type === 'expense' &&
        t.date >= periodStart &&
        t.date <= periodEnd,
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const percent = budget.amount > 0 ? Math.min(spent / budget.amount, 999) : 0;

  return {
    spent,
    remaining: budget.amount - spent,
    percent,
    over: spent > budget.amount,
  };
}
