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
    const oneTime = s.periodType === 'one-time';
    const pct = Math.min(s.progressPercent * 100, 100);
    let state = '';
    if (oneTime && s.overdrawn) state = 'over';
    else if (pct >= 85 && pct < 100) state = 'warning';
    // One-time budgets fill the bar by lifetime balance, so the amount already reads as the
    // available balance; monthly budgets show contributions with a separate lifetime line.
    const amountLabel = oneTime ? `${formatCents(s.progress)} available` : `${formatCents(s.progress)} contributed`;
    const balanceLine = oneTime
      ? ''
      : `<div class="balance ${s.overdrawn ? 'over' : ''}">Lifetime Balance: ${formatCents(s.balance)}</div>`;
    this.shadowRoot!.innerHTML = `
      <div class="track">
        <div class="fill ${state}" style="width:${pct}%"></div>
      </div>
      <div class="label">
        <span>${amountLabel}</span>
        <span>${formatCents(s.target)} goal</span>
      </div>
      ${balanceLine}
    `;
  }
}

customElements.define('budget-progress-bar', BudgetProgressBar);
