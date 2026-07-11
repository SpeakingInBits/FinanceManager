import { appStore } from '@/state/app-store';
import { formatCents } from '@/utils/currency';
import { occurrencesForMonth } from '@/utils/recurrence';
import { computeBudgetStats } from '@/utils/budget';
import { categoryBreakdown } from '@/charts/chart-utils';
import type { PieChart } from '@/charts/pie-chart';

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
          <div class="stat-label">Expenses</div>
          <div class="stat-value expense-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">Net</div>
          <div class="stat-value net-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">In Budgets</div>
          <div class="stat-value budgets-stat"></div>
        </div>
      </div>

      <section class="card">
        <h2>Expense breakdown</h2>
        <div class="chart-card">
          <pie-chart></pie-chart>
        </div>
      </section>
    `;

    this.unsubscribe = appStore.subscribe(() => this.update());
    this.update();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private update(): void {
    const { transactions, budgets, categories, selectedMonth } = appStore.getState();
    const inMonth = occurrencesForMonth(transactions, selectedMonth).map((o) => ({
      ...o.transaction,
      amount: o.displayAmount,
    }));
    // Money earmarked for a budget isn't normal cash flow: it's a contribution into (or spend
    // from) that budget's own balance, not part of this month's regular income/expenses.
    const notBudgeted = inMonth.filter((t) => t.budgetId === null);

    const income = notBudgeted.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = notBudgeted.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    // Budget balances are lifetime, not scoped to the selected month, so use the raw transaction
    // history rather than `inMonth`.
    const budgetsTotal = budgets.reduce(
      (sum, b) => sum + computeBudgetStats(b, transactions).balance,
      0,
    );

    this.querySelector('.income-stat')!.textContent = formatCents(income);
    this.querySelector('.expense-stat')!.textContent = formatCents(expense);
    this.querySelector('.net-stat')!.textContent = formatCents(income - expense);
    this.querySelector('.budgets-stat')!.textContent = formatCents(budgetsTotal);

    const pie = this.querySelector('pie-chart') as PieChart;
    pie.data = categoryBreakdown(notBudgeted, categories, 'expense');
  }
}

customElements.define('dashboard-view', DashboardView);
