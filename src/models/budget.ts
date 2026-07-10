export type BudgetPeriodType = 'monthly' | 'one-time';

export interface Budget {
  id: string;
  name: string;
  /** Integer minor units (cents). Contribution goal for this budget's period window (not a spending cap). */
  targetAmount: number;
  periodType: BudgetPeriodType;
  /** Epoch millis; for monthly budgets, the month it starts recurring. */
  startDate: number;
  /** Epoch millis; end of a one-time budget, or an explicit end to a monthly budget. */
  endDate: number | null;
  /** null = general budget not tied to one category. */
  categoryId: string | null;
  createdAt: number;
}

export type NewBudget = Omit<Budget, 'id' | 'createdAt'>;
