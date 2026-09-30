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

type BreakdownView = 'combined' | 'split';

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
          <button type="button" class="btn allocate-remaining-btn">Allocate Remaining Funds</button>
        </div>
        <budget-list></budget-list>
      </section>

      <section class="card">
        <div class="view-header">
          <h2>Expense breakdown</h2>
          <div class="segmented breakdown-toggle" role="group" aria-label="Expense breakdown view">
            <button type="button" data-view="combined" aria-pressed="true">Combined</button>
            <button type="button" data-view="split" aria-pressed="false">Split</button>
          </div>
        </div>
        <div class="chart-card combined-breakdown">
          <pie-chart class="expense-pie"></pie-chart>
        </div>
        <div class="split-breakdown" hidden>
          <div class="split-breakdown-part">
            <h3>Recurring <span class="split-total recurring-breakdown-total"></span></h3>
            <div class="chart-card">
              <pie-chart class="recurring-pie"></pie-chart>
            </div>
          </div>
          <div class="split-breakdown-part">
            <h3>One-time <span class="split-total onetime-breakdown-total"></span></h3>
            <div class="chart-card">
              <pie-chart class="onetime-pie"></pie-chart>
            </div>
          </div>
        </div>
      </section>

      <modal-dialog heading="Edit budget" class="budget-modal">
        <budget-form></budget-form>
      </modal-dialog>

      <modal-dialog heading="Allocate remaining funds" class="allocate-modal">
        <allocate-funds-form></allocate-funds-form>
      </modal-dialog>
    `;

    this.querySelector('.allocate-remaining-btn')!.addEventListener('click', () => {
      const form = this.querySelector('allocate-funds-form') as AllocateFundsForm;
      const { selectedMonth } = appStore.getState();
      const now = Date.now();
      // Date the fills inside the viewed month: today when viewing the current month, the
      // month's first day otherwise, so they land in the totals the user is looking at.
      form.allocationDate = startOfMonth(now) === selectedMonth ? now : selectedMonth;
      form.availableFunds = this.remainingCents;
      (this.querySelector('.allocate-modal') as ModalDialog).open();
    });

    this.querySelectorAll<HTMLButtonElement>('.breakdown-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => this.setBreakdownView(btn.dataset.view as BreakdownView));
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

  /** Switches the Expense breakdown card between one combined pie and a recurring/one-time split. */
  private setBreakdownView(view: BreakdownView): void {
    this.querySelectorAll('.breakdown-toggle button').forEach((b) =>
      b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.view === view)),
    );
    (this.querySelector('.combined-breakdown') as HTMLElement).hidden = view !== 'combined';
    (this.querySelector('.split-breakdown') as HTMLElement).hidden = view !== 'split';
  }

  private closeModals(): void {
    (this.querySelector('.budget-modal') as ModalDialog)?.close();
    (this.querySelector('.allocate-modal') as ModalDialog)?.close();
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
      .filter((t) => t.budgetId !== null && t.type !== 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const income = notBudgeted.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
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

    // Both views are kept current so toggling between them never shows stale data.
    const pie = this.querySelector('.expense-pie') as PieChart;
    pie.data = categoryBreakdownBySubcategory(notBudgeted, categories, 'expense');
    const recurringPie = this.querySelector('.recurring-pie') as PieChart;
    recurringPie.data = categoryBreakdownBySubcategory(
      expenses.filter((t) => t.recurrence !== null),
      categories,
      'expense',
    );
    const oneTimePie = this.querySelector('.onetime-pie') as PieChart;
    oneTimePie.data = categoryBreakdownBySubcategory(
      expenses.filter((t) => t.recurrence === null),
      categories,
      'expense',
    );
    this.querySelector('.recurring-breakdown-total')!.textContent = formatCents(recurringExpense);
    this.querySelector('.onetime-breakdown-total')!.textContent = formatCents(oneTimeExpense);
  }
}

customElements.define('dashboard-view', DashboardView);
