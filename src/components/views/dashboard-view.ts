import { appStore } from '@/state/app-store';
import { formatCents } from '@/utils/currency';
import { monthBounds } from '@/utils/date';
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

      <div class="stat-grid">
        <div class="card stat-tile">
          <div class="stat-label">Income this month</div>
          <div class="stat-value income-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">Expenses this month</div>
          <div class="stat-value expense-stat"></div>
        </div>
        <div class="card stat-tile">
          <div class="stat-label">Net this month</div>
          <div class="stat-value net-stat"></div>
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
    const { transactions, categories } = appStore.getState();
    const [start, end] = monthBounds(Date.now());
    const inMonth = transactions.filter((t) => t.date >= start && t.date <= end);

    const income = inMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = inMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    this.querySelector('.income-stat')!.textContent = formatCents(income);
    this.querySelector('.expense-stat')!.textContent = formatCents(expense);
    this.querySelector('.net-stat')!.textContent = formatCents(income - expense);

    const pie = this.querySelector('pie-chart') as PieChart;
    pie.data = categoryBreakdown(inMonth, categories, 'expense');
  }
}

customElements.define('dashboard-view', DashboardView);
