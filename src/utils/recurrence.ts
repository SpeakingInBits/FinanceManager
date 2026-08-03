import { monthBounds, shiftMonth, startOfMonth } from './date';
import type { Transaction, RecurrenceFrequency } from '@/models/transaction';

/** Converts a per-occurrence amount to its monthly-equivalent (yearly / 12, rounded to whole cents). */
export function monthlyEquivalentAmount(amount: number, recurrence: RecurrenceFrequency | null): number {
  return recurrence === 'yearly' ? Math.round(amount / 12) : amount;
}

/** A transaction as it should be shown/summed for a specific month. */
export interface MonthlyOccurrence {
  transaction: Transaction;
  displayDate: number;
  displayAmount: number;
}

function projectDayIntoMonth(anchor: number, monthStart: number): number {
  const anchorDate = new Date(anchor);
  const target = new Date(monthStart);
  const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(anchorDate.getDate(), daysInMonth);
  return new Date(target.getFullYear(), target.getMonth(), day).getTime();
}

/**
 * Expands a transaction into every occurrence realized up to and including `monthStart`'s month.
 * A one-off yields its single dated occurrence (wherever it falls, even past `monthStart`); a
 * recurring transaction yields one monthly-equivalent occurrence per month from its anchor month
 * through `monthStart` — none if it starts after `monthStart`.
 */
export function occurrencesThroughMonth(t: Transaction, monthStart: number): MonthlyOccurrence[] {
  if (!t.recurrence) return [{ transaction: t, displayDate: t.date, displayAmount: t.amount }];
  const displayAmount = monthlyEquivalentAmount(t.amount, t.recurrence);
  const limit = startOfMonth(monthStart);
  const occurrences: MonthlyOccurrence[] = [];
  for (let m = startOfMonth(t.date); m <= limit; m = shiftMonth(m, 1)) {
    occurrences.push({ transaction: t, displayDate: projectDayIntoMonth(t.date, m), displayAmount });
  }
  return occurrences;
}

/**
 * Projects recurring transactions into `monthStart`'s month as monthly-equivalent occurrences
 * (starting the month they were created in), and includes one-off transactions dated within it.
 */
export function occurrencesForMonth(transactions: Transaction[], monthStart: number): MonthlyOccurrence[] {
  const [rangeStart, rangeEnd] = monthBounds(monthStart);
  const occurrences: MonthlyOccurrence[] = [];
  for (const t of transactions) {
    if (!t.recurrence) {
      if (t.date >= rangeStart && t.date <= rangeEnd) {
        occurrences.push({ transaction: t, displayDate: t.date, displayAmount: t.amount });
      }
      continue;
    }
    if (startOfMonth(t.date) > monthStart) continue;
    occurrences.push({
      transaction: t,
      displayDate: projectDayIntoMonth(t.date, monthStart),
      displayAmount: monthlyEquivalentAmount(t.amount, t.recurrence),
    });
  }
  return occurrences;
}
