import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@/components/shared/icon';
import '@/components/shared/empty-state';
import '@/components/shared/modal-dialog';
import '@/components/shared/amount-input';
import '@/components/transactions/month-nav';
import '@/components/budgets/budget-progress-bar';
import '@/components/budgets/budget-card';
import '@/components/budgets/budget-list';
import '@/components/budgets/budget-form';
import '@/components/budgets/allocate-funds-form';
import '@/charts/pie-chart';
import './dashboard-view';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { startOfMonth } from '@/utils/date';
import type { Transaction } from '@/models/transaction';
import type { Budget } from '@/models/budget';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'expense',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    subcategoryId: null,
    budgetId: null,
    note: '',
    recurrence: null,
    recurrenceEnd: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Vacation Fund',
    description: '',
    targetAmount: 100000,
    periodType: 'monthly',
    startDate: new Date(2020, 0, 1).getTime(),
    endDate: null,
    categoryId: null,
    subcategoryId: null,
    createdAt: 0,
    ...overrides,
  };
}

const july = startOfMonth(new Date(2026, 6, 15).getTime());

function mount(): HTMLElement {
  document.body.innerHTML = '';
  const el = document.createElement('dashboard-view');
  document.body.appendChild(el);
  return el;
}

function stat(el: HTMLElement, className: string): string {
  return el.querySelector(`.${className}`)!.textContent!;
}

beforeEach(() => {
  appStore.setState({ transactions: [], categories: [], budgets: [], selectedMonth: july });
  document.body.innerHTML = '';
});

describe('dashboard-view stat tiles', () => {
  it('sums income and expenses for the selected month, excluding budget-linked transactions', () => {
    appStore.setState({
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 2000 }),
        makeTransaction({ id: 'c', type: 'income', amount: 9999, budgetId: 'b1' }),
        makeTransaction({ id: 'd', type: 'expense', amount: 8888, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$50.00');
    expect(stat(el, 'onetime-expense-stat')).toBe('$20.00');
    expect(stat(el, 'net-stat')).toBe('$30.00');
  });

  it('splits expenses into recurring and one-time tiles', () => {
    appStore.setState({
      transactions: [
        makeTransaction({ id: 'a', type: 'expense', amount: 3000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 1500, recurrence: 'monthly' }),
        makeTransaction({ id: 'c', type: 'expense', amount: 1200, recurrence: 'yearly' }),
      ],
    });
    const el = mount();
    // yearly 1200 shows as its monthly-equivalent (100), plus the monthly 1500 => 1600 recurring.
    expect(stat(el, 'recurring-expense-stat')).toBe('$16.00');
    expect(stat(el, 'onetime-expense-stat')).toBe('$30.00');
    // Net still nets out total expenses against income.
    expect(stat(el, 'net-stat')).toBe('-$46.00');
  });

  it('shows $0.00 in the recurring tile when there are only one-off expenses', () => {
    appStore.setState({
      transactions: [makeTransaction({ type: 'expense', amount: 2000 })],
    });
    const el = mount();
    expect(stat(el, 'recurring-expense-stat')).toBe('$0.00');
    expect(stat(el, 'onetime-expense-stat')).toBe('$20.00');
  });

  it('excludes transactions from a different month', () => {
    appStore.setState({
      transactions: [
        makeTransaction({ type: 'income', amount: 5000, date: new Date(2026, 5, 1).getTime() }),
      ],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$0.00');
  });

  it('counts allocation (fill) transactions in the Contrib. to budgets tile and subtracts them from Net', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 1000 }),
        makeTransaction({ id: 'c', type: 'allocation', amount: 1500, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    // The paycheck counts as regular income in full; the fill moves money out afterwards.
    expect(stat(el, 'income-stat')).toBe('$50.00');
    expect(stat(el, 'contrib-to-budgets-stat')).toBe('$15.00');
    expect(stat(el, 'net-stat')).toBe('$40.00');
    expect(stat(el, 'net-after-allocations-stat')).toBe('$25.00');
  });

  it('does not count an allocation as income or expense', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ type: 'allocation', amount: 2000, budgetId: 'b1' })],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$0.00');
    expect(stat(el, 'onetime-expense-stat')).toBe('$0.00');
    expect(stat(el, 'recurring-expense-stat')).toBe('$0.00');
  });

  it('does not let a budget contribution inflate the regular income tile', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ type: 'income', amount: 20000, budgetId: 'b1' })],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$0.00');
  });

  it('subtracts this month\'s budget contributions from Net in the allocations tile', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 2000 }),
        makeTransaction({ id: 'c', type: 'income', amount: 1000, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'net-stat')).toBe('$30.00');
    expect(stat(el, 'net-after-allocations-stat')).toBe('$20.00');
  });

  it('shows this month\'s budget contributions in the Contrib. to budgets tile', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'c', type: 'income', amount: 1000, budgetId: 'b1' }),
        makeTransaction({ id: 'd', type: 'income', amount: 2500, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'contrib-to-budgets-stat')).toBe('$35.00');
  });

  it('shows $0.00 in the Contrib. to budgets tile when nothing is allocated', () => {
    appStore.setState({
      transactions: [makeTransaction({ id: 'a', type: 'income', amount: 5000 })],
    });
    const el = mount();
    expect(stat(el, 'contrib-to-budgets-stat')).toBe('$0.00');
  });

  it('excludes budget contributions from a different month in the Contrib. to budgets tile', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'c', type: 'income', amount: 1000, budgetId: 'b1' }),
        makeTransaction({
          id: 'd',
          type: 'income',
          amount: 9999,
          budgetId: 'b1',
          date: new Date(2026, 5, 1).getTime(),
        }),
      ],
    });
    const el = mount();
    expect(stat(el, 'contrib-to-budgets-stat')).toBe('$10.00');
  });

  it('does not count spending out of a budget as a contribution', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'c', type: 'income', amount: 1000, budgetId: 'b1' }),
        makeTransaction({ id: 'd', type: 'expense', amount: 8888, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'contrib-to-budgets-stat')).toBe('$10.00');
  });

  it('matches Net when nothing is allocated to a budget', () => {
    appStore.setState({
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 2000 }),
      ],
    });
    const el = mount();
    expect(stat(el, 'net-after-allocations-stat')).toBe('$30.00');
  });

  it('ignores spending out of a budget when computing allocations', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 8888, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'net-after-allocations-stat')).toBe('$50.00');
  });

  it('excludes budget contributions from a different month', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({
          id: 'c',
          type: 'income',
          amount: 1000,
          budgetId: 'b1',
          date: new Date(2026, 5, 1).getTime(),
        }),
      ],
    });
    const el = mount();
    expect(stat(el, 'net-after-allocations-stat')).toBe('$50.00');
  });

  it('does not let a budget withdrawal inflate either expenses tile', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ type: 'expense', amount: 15000, budgetId: 'b1' }),
        makeTransaction({ type: 'expense', amount: 9000, budgetId: 'b1', recurrence: 'monthly' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'onetime-expense-stat')).toBe('$0.00');
    expect(stat(el, 'recurring-expense-stat')).toBe('$0.00');
  });
});

describe('dashboard-view allocate remaining funds', () => {
  function allocateBtn(el: HTMLElement): HTMLButtonElement {
    return el.querySelector('.allocate-remaining-btn') as HTMLButtonElement;
  }

  it('disables the button when there are no unallocated funds', () => {
    const el = mount();
    expect(allocateBtn(el).disabled).toBe(true);
  });

  it('disables the button when allocations already consume all income', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'allocation', amount: 5000, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(allocateBtn(el).disabled).toBe(true);
  });

  it('enables the button when the month has unallocated income', () => {
    appStore.setState({
      transactions: [makeTransaction({ id: 'a', type: 'income', amount: 5000 })],
    });
    const el = mount();
    expect(allocateBtn(el).disabled).toBe(false);
  });

  it('opens the modal seeded with the Net after allocations amount', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'b', type: 'expense', amount: 1000 }),
        makeTransaction({ id: 'c', type: 'allocation', amount: 1500, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    allocateBtn(el).click();
    const dialog = el.querySelector('.allocate-modal dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    const form = el.querySelector('allocate-funds-form')!;
    expect(form.shadowRoot!.querySelector('.remaining')!.textContent).toBe(
      'Left to allocate: $25.00',
    );
  });

  it('creates allocation transactions for the entered amounts and closes the modal', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ id: 'a', type: 'income', amount: 5000 })],
    });
    const el = mount();
    const details: TransactionSubmitDetail[] = [];
    el.addEventListener(AppEvents.TransactionSubmit, (e) => {
      details.push((e as CustomEvent<TransactionSubmitDetail>).detail);
    });
    allocateBtn(el).click();
    const form = el.querySelector('allocate-funds-form')!;
    const input = form.shadowRoot!.querySelector('amount-input') as HTMLElement & {
      valueCents: number;
    };
    input.valueCents = 3000;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.shadowRoot!.querySelector('form')!.requestSubmit();

    expect(details).toHaveLength(1);
    expect(details[0]!.input).toMatchObject({ type: 'allocation', amount: 3000, budgetId: 'b1' });
    const dialog = el.querySelector('.allocate-modal dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(false);
  });
});

describe('dashboard-view budgets section', () => {
  it('shows an empty state when there are no budgets', () => {
    const el = mount();
    const list = el.querySelector('budget-list')!;
    expect(list.shadowRoot!.querySelector('empty-state')).toBeTruthy();
  });

  it('renders one budget card per budget, not a single combined figure', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1', name: 'Vacation Fund' }), makeBudget({ id: 'b2', name: 'Emergency Fund' })],
    });
    const el = mount();
    const cards = el.querySelector('budget-list')!.shadowRoot!.querySelectorAll('budget-card');
    expect(cards).toHaveLength(2);
    const names = [...cards].map((c) => c.shadowRoot!.querySelector('.name')!.textContent);
    expect(names).toEqual(['Vacation Fund', 'Emergency Fund']);
  });

  it('reflects each budget\'s own lifetime balance on its card', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ type: 'income', amount: 20000, budgetId: 'b1', date: new Date(2020, 0, 1).getTime() }),
        makeTransaction({ type: 'expense', amount: 5000, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    const card = el.querySelector('budget-list')!.shadowRoot!.querySelector('budget-card')!;
    const bar = card.shadowRoot!.querySelector('budget-progress-bar')!;
    expect(bar.shadowRoot!.textContent).toContain('$150.00');
  });

  it('opens the edit modal with the budget prefilled when a card\'s edit button is clicked', () => {
    appStore.setState({ budgets: [makeBudget({ id: 'b1', name: 'Vacation Fund' })] });
    const el = mount();
    const card = el.querySelector('budget-list')!.shadowRoot!.querySelector('budget-card')!;
    (card.shadowRoot!.querySelector('.edit-btn') as HTMLButtonElement).click();
    const dialog = el.querySelector('.budget-modal dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    const form = el.querySelector('budget-form')!;
    expect(form.shadowRoot!.querySelector<HTMLInputElement>('#name')!.value).toBe('Vacation Fund');
  });

  it('deletes a budget after confirmation when a card\'s delete button is clicked', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    appStore.setState({ budgets: [makeBudget({ id: 'b1' })] });
    const el = mount();
    let deletedId: string | undefined;
    el.addEventListener(AppEvents.BudgetDelete, (e) => {
      deletedId = (e as CustomEvent<{ id: string }>).detail.id;
    });
    const card = el.querySelector('budget-list')!.shadowRoot!.querySelector('budget-card')!;
    (card.shadowRoot!.querySelector('.delete-btn') as HTMLButtonElement).click();
    expect(deletedId).toBe('b1');
    vi.restoreAllMocks();
  });
});

describe('dashboard-view budget withdrawals', () => {
  function withdrawBtn(el: HTMLElement): HTMLButtonElement {
    return el.querySelector('.withdraw-btn') as HTMLButtonElement;
  }

  it('counts a withdrawal as income, raising Net and Net after allocations', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'pay', type: 'income', amount: 5000 }),
        makeTransaction({ id: 'rent', type: 'expense', amount: 1000 }),
        makeTransaction({ id: 'fill', type: 'allocation', amount: 1500, budgetId: 'b1' }),
        makeTransaction({ id: 'w', type: 'withdrawal', amount: 700, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$57.00');
    expect(stat(el, 'net-stat')).toBe('$47.00');
    // The fill is still counted as a contribution; the withdrawal isn't a negative one.
    expect(stat(el, 'contrib-to-budgets-stat')).toBe('$15.00');
    expect(stat(el, 'net-after-allocations-stat')).toBe('$32.00');
  });

  it('does not count a withdrawal as an expense', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ type: 'withdrawal', amount: 700, budgetId: 'b1' })],
    });
    const el = mount();
    expect(stat(el, 'onetime-expense-stat')).toBe('$0.00');
    expect(stat(el, 'recurring-expense-stat')).toBe('$0.00');
  });

  it('ignores withdrawals from other months', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({
          type: 'withdrawal',
          amount: 700,
          budgetId: 'b1',
          date: new Date(2026, 5, 10).getTime(),
        }),
      ],
    });
    const el = mount();
    expect(stat(el, 'income-stat')).toBe('$0.00');
  });

  it('lowers the budget card balance by the amount withdrawn', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'fill', type: 'allocation', amount: 20000, budgetId: 'b1' }),
        makeTransaction({ id: 'w', type: 'withdrawal', amount: 5000, budgetId: 'b1' }),
      ],
    });
    const el = mount();
    const card = el.querySelector('budget-list')!.shadowRoot!.querySelector('budget-card')!;
    const bar = card.shadowRoot!.querySelector('budget-progress-bar')!;
    expect(bar.shadowRoot!.textContent).toContain('$150.00');
  });

  it('disables Withdraw from Budget when no budget has funds', () => {
    appStore.setState({ budgets: [makeBudget({ id: 'b1' })] });
    const el = mount();
    expect(withdrawBtn(el).disabled).toBe(true);
    expect(withdrawBtn(el).title).toBe('No budget has funds to withdraw');
  });

  it('enables Withdraw from Budget once a budget has a positive balance', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ type: 'allocation', amount: 2000, budgetId: 'b1' })],
    });
    const el = mount();
    expect(withdrawBtn(el).disabled).toBe(false);
    expect(withdrawBtn(el).title).toBe('');
  });

  it('withdraws from a budget into income and closes the modal', () => {
    appStore.setState({
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [makeTransaction({ type: 'allocation', amount: 2000, budgetId: 'b1' })],
    });
    const el = mount();
    const details: TransactionSubmitDetail[] = [];
    el.addEventListener(AppEvents.TransactionSubmit, (e) => {
      details.push((e as CustomEvent<TransactionSubmitDetail>).detail);
    });
    withdrawBtn(el).click();
    const dialog = el.querySelector('.withdraw-modal dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    const form = el.querySelector('withdraw-funds-form')!;
    const input = form.shadowRoot!.querySelector('#amount') as HTMLElement & { valueCents: number };
    input.valueCents = 1200;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.shadowRoot!.querySelector('form')!.requestSubmit();

    expect(details).toHaveLength(1);
    // Viewing a past month dates the withdrawal on that month's first day.
    expect(details[0]!.input).toMatchObject({
      type: 'withdrawal',
      amount: 1200,
      budgetId: 'b1',
      date: july,
    });
    expect(dialog.open).toBe(false);
  });
});

describe('dashboard-view expense breakdown views', () => {
  const categories = [
    { id: 'bills', name: 'Bills', parentId: null, color: '#a142f4', createdAt: 0 },
    { id: 'food', name: 'Food', parentId: null, color: '#1e8e3e', createdAt: 0 },
    { id: 'salary', name: 'Salary', parentId: null, color: '#12b5cb', createdAt: 0 },
  ];

  function toggle(el: HTMLElement, view: 'combined' | 'split'): HTMLButtonElement {
    return el.querySelector(`.breakdown-toggle button[data-view="${view}"]`) as HTMLButtonElement;
  }

  function isHidden(el: HTMLElement, selector: string): boolean {
    return (el.querySelector(selector) as HTMLElement).hidden;
  }

  /** Category labels ("Name — amount (share)") in a pie chart's legend, once its scheduled render has run. */
  async function legend(el: HTMLElement, selector: string): Promise<string[]> {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const pie = el.querySelector(selector)!;
    return [...pie.shadowRoot!.querySelectorAll('.legend-name')].map((n) => n.textContent!);
  }

  function seedMixedMonth(): void {
    appStore.setState({
      categories,
      budgets: [makeBudget({ id: 'b1' })],
      transactions: [
        makeTransaction({ id: 'rent', categoryId: 'bills', amount: 150000, recurrence: 'monthly' }),
        makeTransaction({ id: 'insurance', categoryId: 'bills', amount: 120000, recurrence: 'yearly' }),
        makeTransaction({ id: 'groceries', categoryId: 'food', amount: 8000 }),
        makeTransaction({ id: 'pay', type: 'income', categoryId: 'salary', amount: 400000 }),
        makeTransaction({ id: 'budgeted', categoryId: 'food', amount: 5000, budgetId: 'b1' }),
      ],
    });
  }

  it('starts in the combined view with the split view hidden', () => {
    const el = mount();
    expect(toggle(el, 'combined').getAttribute('aria-pressed')).toBe('true');
    expect(toggle(el, 'split').getAttribute('aria-pressed')).toBe('false');
    expect(isHidden(el, '.combined-breakdown')).toBe(false);
    expect(isHidden(el, '.split-breakdown')).toBe(true);
  });

  it('switches to the split view and back', () => {
    const el = mount();
    toggle(el, 'split').click();
    expect(toggle(el, 'split').getAttribute('aria-pressed')).toBe('true');
    expect(toggle(el, 'combined').getAttribute('aria-pressed')).toBe('false');
    expect(isHidden(el, '.combined-breakdown')).toBe(true);
    expect(isHidden(el, '.split-breakdown')).toBe(false);

    toggle(el, 'combined').click();
    expect(toggle(el, 'combined').getAttribute('aria-pressed')).toBe('true');
    expect(isHidden(el, '.combined-breakdown')).toBe(false);
    expect(isHidden(el, '.split-breakdown')).toBe(true);
  });

  it('combines recurring and one-time expenses in the standard view', async () => {
    seedMixedMonth();
    const el = mount();
    expect(await legend(el, '.expense-pie')).toEqual([
      'Bills — $1,600.00 (95%)',
      'Food — $80.00 (5%)',
    ]);
  });

  it('charts recurring and one-time expenses separately in the split view', async () => {
    seedMixedMonth();
    const el = mount();
    toggle(el, 'split').click();
    expect(await legend(el, '.recurring-pie')).toEqual(['Bills — $1,600.00 (100%)']);
    expect(await legend(el, '.onetime-pie')).toEqual(['Food — $80.00 (100%)']);
  });

  it('totals each split at monthly-equivalent amounts, matching the stat tiles', () => {
    seedMixedMonth();
    const el = mount();
    // Rent 1,500 + yearly insurance 1,200 / 12 = 100 => 1,600 recurring. The budget-paid expense
    // and the paycheck are left out, just like the combined pie.
    expect(stat(el, 'recurring-breakdown-total')).toBe('$1,600.00');
    expect(stat(el, 'onetime-breakdown-total')).toBe('$80.00');
    expect(stat(el, 'recurring-breakdown-total')).toBe(stat(el, 'recurring-expense-stat'));
    expect(stat(el, 'onetime-breakdown-total')).toBe(stat(el, 'onetime-expense-stat'));
  });

  it('shows an empty chart for a split with no expenses', async () => {
    appStore.setState({
      categories,
      transactions: [makeTransaction({ id: 'groceries', categoryId: 'food', amount: 8000 })],
    });
    const el = mount();
    toggle(el, 'split').click();
    expect(await legend(el, '.recurring-pie')).toEqual([]);
    expect(el.querySelector('.recurring-pie')!.shadowRoot!.textContent).toContain('No data yet');
    expect(stat(el, 'recurring-breakdown-total')).toBe('$0.00');
  });

  it('follows the selected month and keeps the chosen view when data changes', async () => {
    seedMixedMonth();
    const el = mount();
    toggle(el, 'split').click();
    // In June the recurring rent/insurance haven't started and there are no one-offs.
    appStore.setState({ selectedMonth: startOfMonth(new Date(2026, 5, 15).getTime()) });
    expect(isHidden(el, '.split-breakdown')).toBe(false);
    expect(stat(el, 'recurring-breakdown-total')).toBe('$0.00');
    expect(stat(el, 'onetime-breakdown-total')).toBe('$0.00');
    expect(await legend(el, '.onetime-pie')).toEqual([]);
  });
});
