import { addMonths, dayInMonth, monthStart } from './date';
import type { RecurringTransaction } from '@/models/recurring-transaction';
import type { NewTransaction } from '@/models/transaction';

/** Month-start epoch millis for every month a rule is due to generate, up through `now`, inclusive. */
export function computeMonthsToGenerate(rule: RecurringTransaction, now: number): number[] {
  const nowMonth = monthStart(now);
  const firstMonth =
    rule.lastGeneratedThrough != null
      ? addMonths(monthStart(rule.lastGeneratedThrough), 1)
      : monthStart(rule.startDate);

  const months: number[] = [];
  let cursor = firstMonth;
  while (cursor <= nowMonth && (rule.endDate === null || cursor < rule.endDate)) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

export interface RecurringGenerationResult {
  newTransactions: NewTransaction[];
  ruleUpdates: { id: string; lastGeneratedThrough: number }[];
}

/** Computes the transactions to create and rule updates to persist for a batch of recurring rules. */
export function generateForRules(
  rules: RecurringTransaction[],
  now: number,
): RecurringGenerationResult {
  const newTransactions: NewTransaction[] = [];
  const ruleUpdates: { id: string; lastGeneratedThrough: number }[] = [];

  for (const rule of rules) {
    const months = computeMonthsToGenerate(rule, now);
    if (months.length === 0) continue;

    for (const month of months) {
      newTransactions.push({
        type: rule.type,
        amount: rule.amount,
        date: dayInMonth(month, rule.dayOfMonth),
        categoryId: rule.categoryId,
        subcategoryId: rule.subcategoryId,
        budgetId: rule.budgetId,
        recurringId: rule.id,
        note: rule.note,
      });
    }
    ruleUpdates.push({ id: rule.id, lastGeneratedThrough: months[months.length - 1]! });
  }

  return { newTransactions, ruleUpdates };
}
