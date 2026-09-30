import { describe, it, expect, beforeEach } from 'vitest';
import '@/components/shared/amount-input';
import './withdraw-funds-form';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { startOfMonth } from '@/utils/date';
import type { WithdrawFundsForm } from './withdraw-funds-form';
import type { Budget } from '@/models/budget';
import type { Transaction } from '@/models/transaction';

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Vacation',
    description: '',
    targetAmount: 10000,
    periodType: 'monthly',
    startDate: 0,
    endDate: null,
    categoryId: null,
    subcategoryId: null,
    createdAt: 0,
    ...overrides,
  };
}

function fill(budgetId: string, amount: number, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `fill-${budgetId}-${amount}`,
    type: 'allocation',
    amount,
    date: new Date(2026, 6, 2).getTime(),
    categoryId: null,
    subcategoryId: null,
    budgetId,
    note: '',
    recurrence: null,
    recurrenceEnd: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const july = startOfMonth(new Date(2026, 6, 15).getTime());
const withdrawalDate = new Date(2026, 6, 15).getTime();

function mount(): WithdrawFundsForm {
  document.body.innerHTML = '';
  const el = document.createElement('withdraw-funds-form') as WithdrawFundsForm;
  document.body.appendChild(el);
  el.withdrawalDate = withdrawalDate;
  return el;
}

function setAmount(form: WithdrawFundsForm, cents: number): void {
  const input = form.shadowRoot!.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
  input.valueCents = cents;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function selectBudget(form: WithdrawFundsForm, id: string): void {
  const select = form.shadowRoot!.querySelector<HTMLSelectElement>('#budget')!;
  select.value = id;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function remaining(form: WithdrawFundsForm): Element {
  return form.shadowRoot!.querySelector('.remaining')!;
}

function withdrawBtn(form: WithdrawFundsForm): HTMLButtonElement {
  return form.shadowRoot!.querySelector<HTMLButtonElement>('.withdraw-btn')!;
}

/** Submits programmatically (bypassing the disabled button) and collects what was dispatched. */
function submitted(form: WithdrawFundsForm): TransactionSubmitDetail[] {
  const details: TransactionSubmitDetail[] = [];
  form.addEventListener(AppEvents.TransactionSubmit, (e) => {
    details.push((e as CustomEvent<TransactionSubmitDetail>).detail);
  });
  form.shadowRoot!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  return details;
}

beforeEach(() => {
  appStore.setState({ budgets: [], transactions: [], selectedMonth: july });
  document.body.innerHTML = '';
});

describe('withdraw-funds-form', () => {
  it('explains there is nothing to withdraw when there are no budgets', () => {
    const form = mount();
    expect(form.shadowRoot!.querySelector('.summary')!.textContent).toContain(
      'None of your budgets have funds to withdraw',
    );
    expect(form.shadowRoot!.querySelector('#budget')).toBeNull();
  });

  it('explains there is nothing to withdraw when every budget is empty or overdrawn', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'empty' }), makeBudget({ id: 'overdrawn' })],
      transactions: [
        fill('overdrawn', 1000),
        { ...fill('overdrawn', 3000), id: 'spend', type: 'expense' },
      ],
    });
    const form = mount();
    expect(form.shadowRoot!.querySelector('#budget')).toBeNull();
  });

  it('offers only budgets with a positive balance, labeled with that balance', () => {
    appStore.setState({
      budgets: [
        makeBudget({ id: 'b1', name: 'Vacation' }),
        makeBudget({ id: 'b2', name: 'Car' }),
        makeBudget({ id: 'b3', name: 'Empty' }),
      ],
      transactions: [fill('b1', 50000), fill('b2', 12345)],
    });
    const form = mount();
    const options = [...form.shadowRoot!.querySelectorAll('#budget option')].map((o) => [
      (o as HTMLOptionElement).value,
      o.textContent,
    ]);
    expect(options).toEqual([
      ['b1', 'Vacation ($500.00)'],
      ['b2', 'Car ($123.45)'],
    ]);
  });

  it('computes balances as of the viewed month', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1', name: 'Vacation' })],
      // A $100 monthly fill starting in May has funded May, June and July by the July view.
      transactions: [
        fill('b1', 10000, { recurrence: 'monthly', date: new Date(2026, 4, 1).getTime() }),
      ],
    });
    const form = mount();
    expect(form.shadowRoot!.querySelector('#budget option')!.textContent).toBe(
      'Vacation ($300.00)',
    );
  });

  it('shows what will be left in the chosen budget as the amount changes', () => {
    appStore.setState({ budgets: [makeBudget()], transactions: [fill('b1', 5000)] });
    const form = mount();
    expect(remaining(form).textContent).toBe('Left in budget: $50.00');
    setAmount(form, 2000);
    expect(remaining(form).textContent).toBe('Left in budget: $30.00');
  });

  it('updates what is left when a different budget is chosen', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' }), makeBudget({ id: 'b2', name: 'Car' })],
      transactions: [fill('b1', 5000), fill('b2', 9000)],
    });
    const form = mount();
    setAmount(form, 1000);
    selectBudget(form, 'b2');
    expect(remaining(form).textContent).toBe('Left in budget: $80.00');
  });

  it('disables Withdraw until an amount is entered', () => {
    appStore.setState({ budgets: [makeBudget()], transactions: [fill('b1', 5000)] });
    const form = mount();
    expect(withdrawBtn(form).disabled).toBe(true);
    setAmount(form, 100);
    expect(withdrawBtn(form).disabled).toBe(false);
  });

  it('allows withdrawing exactly the whole balance', () => {
    appStore.setState({ budgets: [makeBudget()], transactions: [fill('b1', 5000)] });
    const form = mount();
    setAmount(form, 5000);
    expect(remaining(form).textContent).toBe('Left in budget: $0.00');
    expect(withdrawBtn(form).disabled).toBe(false);
  });

  it('flags and blocks an amount over the budget balance', () => {
    appStore.setState({ budgets: [makeBudget()], transactions: [fill('b1', 5000)] });
    const form = mount();
    setAmount(form, 5001);
    expect(remaining(form).textContent).toBe('Over by $0.01');
    expect(remaining(form).classList.contains('over')).toBe(true);
    expect(withdrawBtn(form).disabled).toBe(true);
    expect(submitted(form)).toEqual([]);
  });

  it('submits a single withdrawal from the chosen budget, dated in the viewed month', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' }), makeBudget({ id: 'b2', name: 'Car' })],
      transactions: [fill('b1', 5000), fill('b2', 9000)],
    });
    const form = mount();
    let done = false;
    form.addEventListener('form-done', () => {
      done = true;
    });
    selectBudget(form, 'b2');
    setAmount(form, 2500);
    expect(submitted(form)).toEqual([
      {
        input: {
          type: 'withdrawal',
          amount: 2500,
          date: withdrawalDate,
          categoryId: null,
          subcategoryId: null,
          budgetId: 'b2',
          note: '',
          recurrence: null,
          recurrenceEnd: null,
        },
      },
    ]);
    expect(done).toBe(true);
  });

  it('does not submit a zero amount', () => {
    appStore.setState({ budgets: [makeBudget()], transactions: [fill('b1', 5000)] });
    const form = mount();
    expect(submitted(form)).toEqual([]);
  });

  it('resets the amount each time it is reopened', () => {
    appStore.setState({ budgets: [makeBudget()], transactions: [fill('b1', 5000)] });
    const form = mount();
    setAmount(form, 2000);
    form.withdrawalDate = withdrawalDate;
    expect(remaining(form).textContent).toBe('Left in budget: $50.00');
  });

  it('dispatches form-cancel from Cancel', () => {
    appStore.setState({ budgets: [makeBudget()], transactions: [fill('b1', 5000)] });
    const form = mount();
    let cancelled = false;
    form.addEventListener('form-cancel', () => {
      cancelled = true;
    });
    form.shadowRoot!.querySelector<HTMLButtonElement>('.cancel-btn')!.click();
    expect(cancelled).toBe(true);
  });
});
