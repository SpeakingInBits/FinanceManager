import { describe, expect, it } from 'vitest';
import { computeMonthsToGenerate, generateForRules } from './recurring';
import type { RecurringTransaction } from '@/models/recurring-transaction';

function makeRule(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: 'rule-1',
    type: 'expense',
    amount: 1000,
    categoryId: null,
    subcategoryId: null,
    budgetId: null,
    note: 'Rent',
    dayOfMonth: 1,
    startDate: new Date(2026, 0, 1).getTime(),
    endDate: null,
    lastGeneratedThrough: null,
    replacesId: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('computeMonthsToGenerate', () => {
  it('generates through the current month inclusive on first run', () => {
    const rule = makeRule({ startDate: new Date(2026, 0, 1).getTime() });
    const now = new Date(2026, 2, 15).getTime(); // March 15
    const months = computeMonthsToGenerate(rule, now);
    expect(months).toEqual([
      new Date(2026, 0, 1).getTime(),
      new Date(2026, 1, 1).getTime(),
      new Date(2026, 2, 1).getTime(),
    ]);
  });

  it('is a no-op once caught up through the current month', () => {
    const rule = makeRule({ lastGeneratedThrough: new Date(2026, 2, 1).getTime() });
    const now = new Date(2026, 2, 20).getTime();
    expect(computeMonthsToGenerate(rule, now)).toEqual([]);
  });

  it('resumes from the month after lastGeneratedThrough', () => {
    const rule = makeRule({ lastGeneratedThrough: new Date(2026, 1, 1).getTime() });
    const now = new Date(2026, 2, 5).getTime();
    expect(computeMonthsToGenerate(rule, now)).toEqual([new Date(2026, 2, 1).getTime()]);
  });

  it('walks correctly across a year boundary', () => {
    const rule = makeRule({ lastGeneratedThrough: new Date(2025, 10, 1).getTime() }); // Nov 2025
    const now = new Date(2026, 0, 10).getTime(); // Jan 2026
    expect(computeMonthsToGenerate(rule, now)).toEqual([
      new Date(2025, 11, 1).getTime(),
      new Date(2026, 0, 1).getTime(),
    ]);
  });

  it('stops before the exclusive endDate boundary', () => {
    const rule = makeRule({
      startDate: new Date(2026, 0, 1).getTime(),
      endDate: new Date(2026, 2, 1).getTime(), // stops generating for March onward
    });
    const now = new Date(2026, 5, 1).getTime();
    expect(computeMonthsToGenerate(rule, now)).toEqual([
      new Date(2026, 0, 1).getTime(),
      new Date(2026, 1, 1).getTime(),
    ]);
  });

  it('generates nothing when endDate equals startDate (stopped before ever firing)', () => {
    const rule = makeRule({
      startDate: new Date(2026, 0, 1).getTime(),
      endDate: new Date(2026, 0, 1).getTime(),
    });
    expect(computeMonthsToGenerate(rule, new Date(2026, 5, 1).getTime())).toEqual([]);
  });

  it('backfills a multi-month gap after the app was closed for a while', () => {
    const rule = makeRule({
      startDate: new Date(2025, 11, 1).getTime(), // Dec 2025
    });
    const now = new Date(2026, 2, 1).getTime(); // March 2026, opened for the first time since
    expect(computeMonthsToGenerate(rule, now)).toHaveLength(4); // Dec, Jan, Feb, Mar
  });
});

describe('generateForRules', () => {
  it('clamps day 31 to the last day of February (non-leap and leap years)', () => {
    const rule = makeRule({
      dayOfMonth: 31,
      startDate: new Date(2025, 0, 1).getTime(),
      lastGeneratedThrough: new Date(2025, 0, 1).getTime(),
    });
    const now = new Date(2025, 1, 15).getTime(); // Feb 2025 (non-leap)
    const { newTransactions } = generateForRules([rule], now);
    expect(new Date(newTransactions[0]!.date).getDate()).toBe(28);

    const leapRule = makeRule({
      dayOfMonth: 31,
      startDate: new Date(2024, 0, 1).getTime(),
      lastGeneratedThrough: new Date(2024, 0, 1).getTime(),
    });
    const nowLeap = new Date(2024, 1, 15).getTime(); // Feb 2024 (leap)
    const { newTransactions: leapTransactions } = generateForRules([leapRule], nowLeap);
    expect(new Date(leapTransactions[0]!.date).getDate()).toBe(29);
  });

  it('tags generated transactions with recurringId and only updates rules that generated something', () => {
    const dueRule = makeRule({ id: 'due', startDate: new Date(2026, 0, 1).getTime() });
    const caughtUpRule = makeRule({
      id: 'caught-up',
      lastGeneratedThrough: new Date(2026, 2, 1).getTime(),
    });
    const now = new Date(2026, 2, 1).getTime();

    const { newTransactions, ruleUpdates } = generateForRules([dueRule, caughtUpRule], now);
    expect(newTransactions.every((t) => t.recurringId === 'due')).toBe(true);
    expect(ruleUpdates).toEqual([{ id: 'due', lastGeneratedThrough: new Date(2026, 2, 1).getTime() }]);
  });
});
