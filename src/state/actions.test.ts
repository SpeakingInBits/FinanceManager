import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { appStore } from './app-store';
import { updateTransactionAction } from './actions';
import { getDb } from '@/db/client';
import { addTransaction, getAllTransactions, getTransaction } from '@/db/transactions.repo';
import type { NewTransaction, Transaction } from '@/models/transaction';

const MARCH_10 = new Date(2026, 2, 10).getTime();
const JULY = new Date(2026, 6, 1).getTime();

function newTransaction(overrides: Partial<NewTransaction> = {}): NewTransaction {
  return {
    type: 'expense',
    amount: 1000,
    date: MARCH_10,
    categoryId: null,
    subcategoryId: null,
    budgetId: null,
    note: '',
    recurrence: null,
    recurrenceEnd: null,
    ...overrides,
  };
}

/** The record created by a split (the one that is not `original`). */
async function splitOffRecord(original: Transaction): Promise<Transaction> {
  const added = (await getAllTransactions()).find((t) => t.id !== original.id);
  expect(added).toBeDefined();
  return added!;
}

beforeEach(async () => {
  const db = await getDb();
  await db.clear('transactions');
  // Tests view July 2026; recurring records anchored in March have four earlier months of history.
  appStore.setState({ selectedMonth: JULY, transactions: [] });
});

describe('updateTransactionAction on recurring transactions', () => {
  it('splits instead of rewriting history when the amount changes', async () => {
    const created = await addTransaction(newTransaction({ recurrence: 'monthly', amount: 1000 }));

    await updateTransactionAction(created.id, newTransaction({ recurrence: 'monthly', amount: 2500 }));

    const original = await getTransaction(created.id);
    expect(original).toMatchObject({ amount: 1000, date: MARCH_10, recurrenceEnd: JULY });

    const added = await splitOffRecord(created);
    expect(added).toMatchObject({ amount: 2500, recurrence: 'monthly', recurrenceEnd: null });
    // Anchored in the viewed month, keeping the original day-of-month.
    expect(new Date(added.date).getMonth()).toBe(6);
    expect(new Date(added.date).getDate()).toBe(10);

    expect(appStore.getState().transactions).toHaveLength(2);
  });

  it('splits when the recurrence frequency changes', async () => {
    const created = await addTransaction(newTransaction({ recurrence: 'monthly', amount: 1200 }));

    await updateTransactionAction(created.id, newTransaction({ recurrence: 'yearly', amount: 1200 }));

    expect(await getTransaction(created.id)).toMatchObject({
      recurrence: 'monthly',
      recurrenceEnd: JULY,
    });
    expect(await splitOffRecord(created)).toMatchObject({ recurrence: 'yearly', recurrenceEnd: null });
  });

  it('splits at the submitted date when it falls after the viewed month', async () => {
    const september5 = new Date(2026, 8, 5).getTime();
    const created = await addTransaction(newTransaction({ recurrence: 'monthly', amount: 1000 }));

    await updateTransactionAction(
      created.id,
      newTransaction({ recurrence: 'monthly', amount: 2500, date: september5 }),
    );

    expect(await getTransaction(created.id)).toMatchObject({
      recurrenceEnd: new Date(2026, 8, 1).getTime(),
    });
    expect(await splitOffRecord(created)).toMatchObject({ amount: 2500, date: september5 });
  });

  it('carries the old recurrenceEnd forward when splitting a segment that already ends', async () => {
    const october = new Date(2026, 9, 1).getTime();
    const created = await addTransaction(
      newTransaction({ recurrence: 'monthly', amount: 1000, recurrenceEnd: october }),
    );

    await updateTransactionAction(
      created.id,
      newTransaction({ recurrence: 'monthly', amount: 2500, recurrenceEnd: october }),
    );

    expect(await getTransaction(created.id)).toMatchObject({ recurrenceEnd: JULY });
    expect(await splitOffRecord(created)).toMatchObject({ amount: 2500, recurrenceEnd: october });
  });

  it('splits a recurring transaction turned one-off, keeping earlier occurrences', async () => {
    const created = await addTransaction(newTransaction({ recurrence: 'monthly', amount: 1000 }));

    await updateTransactionAction(created.id, newTransaction({ recurrence: null, amount: 1000 }));

    expect(await getTransaction(created.id)).toMatchObject({
      recurrence: 'monthly',
      recurrenceEnd: JULY,
    });
    expect(await splitOffRecord(created)).toMatchObject({ recurrence: null, recurrenceEnd: null });
  });

  it('edits in place when the amount and recurrence are unchanged', async () => {
    const created = await addTransaction(newTransaction({ recurrence: 'monthly', note: 'old' }));

    await updateTransactionAction(created.id, newTransaction({ recurrence: 'monthly', note: 'Rent' }));

    expect(await getAllTransactions()).toHaveLength(1);
    expect(await getTransaction(created.id)).toMatchObject({ note: 'Rent', recurrenceEnd: null });
  });

  it('edits in place when there are no occurrences before the viewed month', async () => {
    const july5 = new Date(2026, 6, 5).getTime();
    const created = await addTransaction(
      newTransaction({ recurrence: 'monthly', amount: 1000, date: july5 }),
    );

    await updateTransactionAction(
      created.id,
      newTransaction({ recurrence: 'monthly', amount: 2500, date: july5 }),
    );

    expect(await getAllTransactions()).toHaveLength(1);
    expect(await getTransaction(created.id)).toMatchObject({ amount: 2500, recurrenceEnd: null });
  });

  it('edits a one-off in place even when the amount changes', async () => {
    const created = await addTransaction(newTransaction({ amount: 1000 }));

    await updateTransactionAction(created.id, newTransaction({ amount: 999 }));

    expect(await getAllTransactions()).toHaveLength(1);
    expect(await getTransaction(created.id)).toMatchObject({ amount: 999 });
  });
});
