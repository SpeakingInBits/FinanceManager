import { appStore } from '@/state/app-store';
import { formatCents } from '@/utils/currency';
import { occurrencesForMonth } from '@/utils/recurrence';
import { categoryBreakdownBySubcategory } from '@/charts/chart-utils';
import { AppEvents, type BudgetDeleteDetail } from '@/state/events';
import type { PieChart } from '@/charts/pie-chart';
import type { ModalDialog } from '@/components/shared/modal-dialog';
import type { BudgetForm } from '@/components/budgets/budget-form';

export class DashboardView extends HTMLElement {
  private unsubscribe?: () => void;

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
          <div class="stat-label">Net after allocations</div>
          <div class="stat-value net-after-allocations-stat"></div>
        </div>
      </div>

      <section class="card">
        <h2>Budgets</h2>
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
    `;

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

    this.addEventListener('form-done', () => this.closeBudgetModal());
    this.addEventListener('form-cancel', () => this.closeBudgetModal());

    this.unsubscribe = appStore.subscribe(() => this.update());
    this.update();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private closeBudgetModal(): void {
    (this.querySelector('.budget-modal') as ModalDialog)?.close();
  }

  private update(): void {
    const { transactions, categories, selectedMonth } = appStore.getState();
    const inMonth = occurrencesForMonth(transactions, selectedMonth).map((o) => ({
      ...o.transaction,
      amount: o.displayAmount,
    }));
    // Money earmarked for a budget isn't normal cash flow: it's a contribution into (or spend
    // from) that budget's own balance, not part of this month's regular income/expenses.
    const notBudgeted = inMonth.filter((t) => t.budgetId === null);
    // Contributions into budgets this month: income earmarked for a budget. It never reaches the
    // Net tile (which only counts unbudgeted cash flow), so subtracting it from Net shows what's
    // left over once this month's budget funding is set aside.
    const allocations = inMonth
      .filter((t) => t.budgetId !== null && t.type === 'income')
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
    this.querySelector('.net-after-allocations-stat')!.textContent = formatCents(net - allocations);

    const pie = this.querySelector('pie-chart') as PieChart;
    pie.data = categoryBreakdownBySubcategory(notBudgeted, categories, 'expense');
  }
}

customElements.define('dashboard-view', DashboardView);
