import { describe, it, expect, beforeEach } from 'vitest';
import '@/components/shared/icon';
import '@/components/transactions/month-nav';
import '@/charts/pie-chart';
import '@/charts/sankey-chart';
import './charts-view';
import { appStore } from '@/state/app-store';
import { startOfMonth, shiftMonth } from '@/utils/date';
import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'income',
    amount: 1000,
    date: new Date(2026, 6, 10).getTime(),
    categoryId: null,
    subcategoryId: null,
    budgetId: null,
    note: '',
    recurrence: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'c1', name: 'Salary', parentId: null, color: '#ff0000', createdAt: 0, ...overrides };
}

const july = startOfMonth(new Date(2026, 6, 15).getTime());
const june = shiftMonth(july, -1);

function mount(): HTMLElement {
  document.body.innerHTML = '';
  const el = document.createElement('charts-view');
  document.body.appendChild(el);
  return el;
}

/** Chart rendering is scheduled via requestAnimationFrame; flush one to let it run. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** The pie's legend is the rendered view of its data, so assert against that. */
function pieLegend(el: HTMLElement): string {
  return el.querySelector('pie-chart')!.shadowRoot!.querySelector('.legend')!.textContent!;
}

function selectIncome(el: HTMLElement): void {
  el.querySelector<HTMLButtonElement>('.segmented button[data-type="income"]')!.click();
}

beforeEach(() => {
  appStore.setState({ transactions: [], categories: [], budgets: [], selectedMonth: july });
  document.body.innerHTML = '';
});

describe('charts-view month scoping', () => {
  it('shows a month-nav for the breakdown pie', () => {
    const el = mount();
    expect(el.querySelector('month-nav')).toBeTruthy();
  });

  it('limits the income pie to the selected month', async () => {
    appStore.setState({
      categories: [makeCategory({ id: 'salary', name: 'Salary' }), makeCategory({ id: 'bonus', name: 'Bonus' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000, categoryId: 'salary' }),
        makeTransaction({
          id: 'b',
          type: 'income',
          amount: 9999,
          categoryId: 'bonus',
          date: new Date(2026, 5, 1).getTime(),
        }),
      ],
    });
    const el = mount();
    selectIncome(el);
    await nextFrame();
    const legend = pieLegend(el);
    expect(legend).toContain('Salary');
    expect(legend).not.toContain('Bonus');
  });

  it('limits the expense pie to the selected month too', async () => {
    appStore.setState({
      categories: [makeCategory({ id: 'rent', name: 'Rent' }), makeCategory({ id: 'old', name: 'OldSpend' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'expense', amount: 5000, categoryId: 'rent' }),
        makeTransaction({
          id: 'b',
          type: 'expense',
          amount: 9999,
          categoryId: 'old',
          date: new Date(2026, 5, 1).getTime(),
        }),
      ],
    });
    const el = mount();
    await nextFrame();
    const legend = pieLegend(el);
    expect(legend).toContain('Rent');
    expect(legend).not.toContain('OldSpend');
  });

  it('follows the month-nav when the selected month changes', async () => {
    appStore.setState({
      categories: [makeCategory({ id: 'salary', name: 'Salary' }), makeCategory({ id: 'bonus', name: 'Bonus' })],
      transactions: [
        makeTransaction({ id: 'a', type: 'income', amount: 5000, categoryId: 'salary' }),
        makeTransaction({ id: 'b', type: 'income', amount: 9999, categoryId: 'bonus', date: june }),
      ],
    });
    const el = mount();
    selectIncome(el);
    await nextFrame();
    expect(pieLegend(el)).toContain('Salary');

    appStore.setState({ selectedMonth: june });
    await nextFrame();
    const legend = pieLegend(el);
    expect(legend).toContain('Bonus');
    expect(legend).not.toContain('Salary');
  });

  it('projects a recurring income into a later month at its monthly-equivalent amount', async () => {
    appStore.setState({
      categories: [makeCategory({ id: 'salary', name: 'Salary' })],
      transactions: [
        makeTransaction({
          id: 'a',
          type: 'income',
          amount: 1200,
          categoryId: 'salary',
          date: june,
          recurrence: 'yearly',
        }),
      ],
    });
    const el = mount();
    selectIncome(el);
    await nextFrame();
    // Dated in June but recurring, so it still appears in July — as 1200/12 = $1.00.
    expect(pieLegend(el)).toContain('$1.00');
  });

  it('shows the empty state when the selected month has no data', async () => {
    appStore.setState({
      categories: [makeCategory({ id: 'salary', name: 'Salary' })],
      transactions: [makeTransaction({ id: 'a', type: 'income', amount: 5000, categoryId: 'salary', date: june })],
    });
    const el = mount();
    selectIncome(el);
    await nextFrame();
    expect(pieLegend(el)).toBe('');
    expect(el.querySelector('pie-chart')!.shadowRoot!.querySelector('svg')!.textContent).toContain('No data yet');
  });

  it('keeps the cash-flow sankey on all-time data', async () => {
    appStore.setState({
      categories: [makeCategory({ id: 'bonus', name: 'Bonus' })],
      transactions: [
        makeTransaction({ id: 'b', type: 'income', amount: 9999, categoryId: 'bonus', date: june }),
      ],
    });
    const el = mount();
    await nextFrame();
    // June income is outside the selected month (July) but must still reach the sankey.
    expect(el.querySelector('sankey-chart')!.shadowRoot!.textContent).toContain('Bonus');
  });
});
