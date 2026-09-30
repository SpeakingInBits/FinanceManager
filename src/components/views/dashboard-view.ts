import { appStore } from '@/state/app-store';
import { formatCents } from '@/utils/currency';
import { startOfMonth } from '@/utils/date';
import { occurrencesForMonth } from '@/utils/recurrence';
import { categoryBreakdownBySubcategory } from '@/charts/chart-utils';
import { AppEvents, type BudgetDeleteDetail } from '@/state/events';
import type { PieChart } from '@/charts/pie-chart';
import type { ModalDialog } from '@/components/shared/modal-dialog';
import type { BudgetForm } from '@/components/budgets/budget-form';
import type { AllocateFundsForm } from '@/components/budgets/allocate-funds-form';
import {
  withdrawableBudgets,
  type WithdrawFundsForm,
} from '@/components/budgets/withdraw-funds-form';

export class DashboardView extends HTMLElement {
  private unsubscribe?: () => void;
  /** This month's Net after allocations — the pool "Allocate Remaining Funds" can draw from. */
  private remainingCents = 0;

  connectedCallback(): void {
    this.className = 'view';
    this.innerHTML = `
      <div class="view-header">
        <h1>Dashboard</h1>
      </div>

      <month-nav></month-nav>

      <div class="stat-grid">
        <div class="card stat-tile">
          <div class="stat-label">Income</div>
          <div class="stat-value income-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">Recurring expenses</div>
          <div class="stat-value recurring-expense-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">One-time expenses</div>
          <div class="stat-value onetime-expense-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">Net</div>
          <div class="stat-value net-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">Contrib. to budgets</div>
          <div class="stat-value contrib-to-budgets-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">Net after allocations</div>
          <div class="stat-value net-after-allocations-stat"></div>
        </div>
      </div>

      <section class="card">
        <div class="view-header">
          <h2>Budgets</h2>
          <div class="budget-actions">
            <button type="button" class="btn btn-secondary withdraw-btn">Withdraw from Budget</button>
            <button type="button" class="btn allocate-remaining-btn">Allocate Remaining Funds</button>
          </div>
        </div>
        <budget-list></budget-list>
      </section>

      <section class="card">
        <h2>Expense breakdown</h2>
        <div class="chart-card">
          <pie-chart></pie-chart>
        </div>
      </section>

      <modal-dialog heading="Edit budget" class="budget-modal">
        <budget-form></budget-form>
      </modal-dialog>

      <modal-dialog heading="Allocate remaining funds" class="allocate-modal">
        <allocate-funds-form></allocate-funds-form>
      </modal-dialog>

      <modal-dialog heading="Withdraw from budget" class="withdraw-modal">
        <withdraw-funds-form></withdraw-funds-form>
      </modal-dialog>
    `;

    this.querySelector('.allocate-remaining-btn')!.addEventListener('click', () => {
      const form = this.querySelector('allocate-funds-form') as AllocateFundsForm;
      form.allocationDate = this.dateInViewedMonth();
      form.availableFunds = this.remainingCents;
      (this.querySelector('.allocate-modal') as ModalDialog).open();
    });

    this.querySelector('.withdraw-btn')!.addEventListener('click', () => {
      const form = this.querySelector('withdraw-funds-form') as WithdrawFundsForm;
      form.withdrawalDate = this.dateInViewedMonth();
      (this.querySelector('.withdraw-modal') as ModalDialog).open();
    });

    this.addEventListener('edit', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const budget = appStore.getState().budgets.find((b) => b.id === id) ?? null;
      const form = this.querySelector('budget-form') as BudgetForm;
      form.budget = budget;
      (this.querySelector('.budget-modal') as ModalDialog).open();
    });

    this.addEventListener('delete', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (confirm('Delete this budget?')) {
        this.dispatchEvent(
          new CustomEvent<BudgetDeleteDetail>(AppEvents.BudgetDelete, {
            detail: { id },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    this.addEventListener('form-done', () => this.closeModals());
    this.addEventListener('form-cancel', () => this.closeModals());

    this.unsubscribe = appStore.subscribe(() => this.update());
    this.update();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  /**
   * Date for fills/withdrawals made from the dashboard: today when viewing the current month, the
   * viewed month's first day otherwise, so they land in the totals the user is looking at.
   */
  private dateInViewedMonth(): number {
    const { selectedMonth } = appStore.getState();
    const now = Date.now();
    return startOfMonth(now) === selectedMonth ? now : selectedMonth;
  }

  private closeModals(): void {
    (this.querySelector('.budget-modal') as ModalDialog)?.close();
    (this.querySelector('.allocate-modal') as ModalDialog)?.close();
    (this.querySelector('.withdraw-modal') as ModalDialog)?.close();
  }

  private update(): void {
    const { transactions, categories, selectedMonth } = appStore.getState();
    const inMonth = occurrencesForMonth(transactions, selectedMonth).map((o) => ({
      ...o.transaction,
      amount: o.displayAmount,
    }));
    // Money earmarked for a budget isn't normal cash flow: it's a fill into (or spend from) that
    // budget's own balance, not part of this month's regular income/expenses.
    const notBudgeted = inMonth.filter((t) => t.budgetId === null);
    // Fills into budgets this month: 'allocation' transactions (and pre-v7 budget-linked income,
    // counted the same for unmigrated data). Fills never reach the Net tile (which only counts
    // unbudgeted cash flow), so subtracting them from Net shows what's left over once this
    // month's budget funding is set aside.
    const allocations = inMonth
      .filter((t) => t.budgetId !== null && (t.type === 'allocation' || t.type === 'income'))
      .reduce((s, t) => s + t.amount, 0);
    // Withdrawals move money out of a budget back into general income, so they count as income
    // this month and raise the funds left to spend or allocate elsewhere.
    const withdrawals = inMonth
      .filter((t) => t.type === 'withdrawal')
      .reduce((s, t) => s + t.amount, 0);

    const income =
      notBudgeted.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0) +
      withdrawals;
    const expenses = notBudgeted.filter((t) => t.type === 'expense');
    // A recurring transaction carries a non-null `recurrence`; a one-off has `recurrence: null`.
    const recurringExpense = expenses
      .filter((t) => t.recurrence !== null)
      .reduce((s, t) => s + t.amount, 0);
    const oneTimeExpense = expenses
      .filter((t) => t.recurrence === null)
      .reduce((s, t) => s + t.amount, 0);
    const expense = recurringExpense + oneTimeExpense;

    this.querySelector('.income-stat')!.textContent = formatCents(income);
    this.querySelector('.recurring-expense-stat')!.textContent = formatCents(recurringExpense);
    this.querySelector('.onetime-expense-stat')!.textContent = formatCents(oneTimeExpense);
    const net = income - expense;
    this.querySelector('.net-stat')!.textContent = formatCents(net);
    this.querySelector('.contrib-to-budgets-stat')!.textContent = formatCents(allocations);
    this.remainingCents = net - allocations;
    this.querySelector('.net-after-allocations-stat')!.textContent = formatCents(this.remainingCents);

    const allocateBtn = this.querySelector<HTMLButtonElement>('.allocate-remaining-btn')!;
    allocateBtn.disabled = this.remainingCents <= 0;
    allocateBtn.title = this.remainingCents <= 0 ? 'No unallocated funds this month' : '';

    const withdrawBtn = this.querySelector<HTMLButtonElement>('.withdraw-btn')!;
    const canWithdraw = withdrawableBudgets(selectedMonth).length > 0;
    withdrawBtn.disabled = !canWithdraw;
    withdrawBtn.title = canWithdraw ? '' : 'No budget has funds to withdraw';

    const pie = this.querySelector('pie-chart') as PieChart;
    pie.data = categoryBreakdownBySubcategory(notBudgeted, categories, 'expense');
  }
}

customElements.define('dashboard-view', DashboardView);
