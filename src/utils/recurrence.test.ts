import { describe, it, expect } from 'vitest';
import { monthlyEquivalentAmount, occurrencesForMonth } from './recurrence';
import type { Transaction } from '@/models/transaction';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'id-1',
    type: 'expense',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    budgetId: null,
    note: '',
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('monthlyEquivalentAmount', () => {
  it('returns the amount unchanged for one-off transactions', () => {
    expect(monthlyEquivalentAmount(1200, null)).toBe(1200);
  });

  it('returns the amount unchanged for monthly recurrence', () => {
    expect(monthlyEquivalentAmount(1000, 'monthly')).toBe(1000);
  });

  it('divides yearly amounts by 12', () => {
    expect(monthlyEquivalentAmount(120000, 'yearly')).toBe(10000);
  });

  it('rounds yearly amounts that do not divide evenly', () => {
    // 100 / 12 = 8.333... -> rounds to 8
    expect(monthlyEquivalentAmount(100, 'yearly')).toBe(8);
    // 110 / 12 = 9.166... -> rounds to 9
    expect(monthlyEquivalentAmount(110, 'yearly')).toBe(9);
    // 115 / 12 = 9.583... -> rounds to 10
    expect(monthlyEquivalentAmount(115, 'yearly')).toBe(10);
  });
});

describe('occurrencesForMonth', () => {
  const july = new Date(2026, 6, 1).getTime();

  it('includes a one-off transaction dated within the month', () => {
    const t = makeTransaction({ date: new Date(2026, 6, 20).getTime() });
    const result = occurrencesForMonth([t], july);
    expect(result).toHaveLength(1);
    expect(result[0]!.displayAmount).toBe(1000);
    expect(result[0]!.displayDate).toBe(t.date);
  });

  it('excludes a one-off transaction dated in a different month', () => {
    const t = makeTransaction({ date: new Date(2026, 5, 20).getTime() });
    expect(occurrencesForMonth([t], july)).toHaveLength(0);
  });

  it('includes a one-off transaction on the last instant of the month', () => {
    const t = makeTransaction({ date: new Date(2026, 6, 31, 23, 59, 59, 999).getTime() });
    expect(occurrencesForMonth([t], july)).toHaveLength(1);
  });

  it('projects a monthly recurring transaction into the viewed month at monthly amount', () => {
    const t = makeTransaction({
      recurrence: 'monthly',
      amount: 1000,
      date: new Date(2026, 0, 15).getTime(),
    });
    const result = occurrencesForMonth([t], july);
    expect(result).toHaveLength(1);
    expect(result[0]!.displayAmount).toBe(1000);
    expect(new Date(result[0]!.displayDate).getMonth()).toBe(6);
    expect(new Date(result[0]!.displayDate).getDate()).toBe(15);
  });

  it('projects a yearly recurring transaction at its monthly-equivalent amount', () => {
    const t = makeTransaction({
      recurrence: 'yearly',
      amount: 120000,
      date: new Date(2026, 0, 15).getTime(),
    });
    const result = occurrencesForMonth([t], july);
    expect(result).toHaveLength(1);
    expect(result[0]!.displayAmount).toBe(10000);
  });

  it('excludes a recurring transaction from months before its start month', () => {
    const t = makeTransaction({
      recurrence: 'monthly',
      date: new Date(2026, 7, 1).getTime(), // starts August
    });
    expect(occurrencesForMonth([t], july)).toHaveLength(0);
  });

  it('includes a recurring transaction starting in the exact viewed month', () => {
    const t = makeTransaction({ recurrence: 'monthly', date: new Date(2026, 6, 5).getTime() });
    expect(occurrencesForMonth([t], july)).toHaveLength(1);
  });

  it('keeps projecting a recurring transaction into months far after its start', () => {
    const t = makeTransaction({ recurrence: 'yearly', date: new Date(2020, 0, 1).getTime() });
    expect(occurrencesForMonth([t], july)).toHaveLength(1);
  });

  it('clamps the projected day when the anchor day does not exist in the target month', () => {
    const t = makeTransaction({ recurrence: 'monthly', date: new Date(2026, 0, 31).getTime() });
    // February 2026 (non-leap) only has 28 days.
    const feb = new Date(2026, 1, 1).getTime();
    const result = occurrencesForMonth([t], feb);
    expect(new Date(result[0]!.displayDate).getDate()).toBe(28);
    expect(new Date(result[0]!.displayDate).getMonth()).toBe(1);
  });

  it('does not mutate the original transaction object', () => {
    const t = makeTransaction({ recurrence: 'yearly', amount: 120000 });
    const [occurrence] = occurrencesForMonth([t], july);
    expect(occurrence!.transaction).toBe(t);
    expect(t.amount).toBe(120000);
  });

  it('mixes one-off and recurring transactions in the same month', () => {
    const oneOff = makeTransaction({ id: 'a', date: new Date(2026, 6, 3).getTime() });
    const recurring = makeTransaction({
      id: 'b',
      recurrence: 'monthly',
      date: new Date(2026, 3, 3).getTime(),
    });
    const result = occurrencesForMonth([oneOff, recurring], july);
    expect(result.map((o) => o.transaction.id).sort()).toEqual(['a', 'b']);
  });
});
