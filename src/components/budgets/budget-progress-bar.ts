import css from './budget-progress-bar.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { formatCents } from '@/utils/currency';
import type { BudgetStats } from '@/utils/budget';

export class BudgetProgressBar extends HTMLElement {
  private _stats?: BudgetStats;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set stats(value: BudgetStats) {
    this._stats = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._stats) return;
    const s = this._stats;
    const pct = Math.min(s.contributionPercent * 100, 100);
    const state = pct >= 85 && pct < 100 ? 'warning' : '';
    this.shadowRoot!.innerHTML = `
      <div class="track">
        <div class="fill ${state}" style="width:${pct}%"></div>
      </div>
      <div class="label">
        <span>${formatCents(s.contributed)} contributed</span>
        <span>${formatCents(s.target)} goal</span>
      </div>
      <div class="balance ${s.overdrawn ? 'over' : ''}">Balance: ${formatCents(s.balance)}</div>
    `;
  }
}

customElements.define('budget-progress-bar', BudgetProgressBar);
