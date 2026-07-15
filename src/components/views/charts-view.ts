import { appStore } from '@/state/app-store';
import { buildSankeyGraph, categoryBreakdownBySubcategory } from '@/charts/chart-utils';
import { occurrencesForMonth } from '@/utils/recurrence';
import type { Transaction } from '@/models/transaction';
import type { PieChart } from '@/charts/pie-chart';
import type { SankeyChart } from '@/charts/sankey-chart';

export class ChartsView extends HTMLElement {
  private unsubscribe?: () => void;
  private pieType: Transaction['type'] = 'expense';

  connectedCallback(): void {
    this.className = 'view';
    this.innerHTML = `
      <div class="view-header">
        <h1>Charts</h1>
      </div>

      <section class="card">
        <div class="view-header">
          <h2>Breakdown by category</h2>
          <div class="segmented" role="group" aria-label="Breakdown type">
            <button type="button" data-type="expense" aria-pressed="true">Expense</button>
            <button type="button" data-type="income" aria-pressed="false">Income</button>
          </div>
        </div>
        <month-nav></month-nav>
        <div class="chart-card">
          <pie-chart></pie-chart>
        </div>
      </section>

      <section class="card">
        <h2>Cash flow (all time)</h2>
        <div class="chart-card">
          <sankey-chart></sankey-chart>
        </div>
      </section>
    `;

    this.querySelectorAll<HTMLButtonElement>('.segmented button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.pieType = btn.dataset.type as Transaction['type'];
        this.querySelectorAll('.segmented button').forEach((b) =>
          b.setAttribute('aria-pressed', String(b === btn)),
        );
        this.updateCharts();
      });
    });

    this.unsubscribe = appStore.subscribe(() => this.updateCharts());
    this.updateCharts();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private updateCharts(): void {
    const { transactions, categories, budgets, selectedMonth } = appStore.getState();
    // The breakdown pie is scoped to the selected month, matching the dashboard: recurring
    // transactions are projected into the month at their monthly-equivalent amount. The cash-flow
    // sankey stays all-time — its budget pass-through nodes only make sense across the full history.
    const inMonth = occurrencesForMonth(transactions, selectedMonth).map((o) => ({
      ...o.transaction,
      amount: o.displayAmount,
    }));
    const pie = this.querySelector('pie-chart') as PieChart;
    pie.data = categoryBreakdownBySubcategory(inMonth, categories, this.pieType);

    const sankey = this.querySelector('sankey-chart') as SankeyChart;
    sankey.data = buildSankeyGraph(transactions, categories, budgets);
  }
}

customElements.define('charts-view', ChartsView);
