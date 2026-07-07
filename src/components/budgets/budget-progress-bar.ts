import css from './budget-progress-bar.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { formatCents } from '@/utils/currency';
import type { BudgetProgress } from '@/utils/budget';

export class BudgetProgressBar extends HTMLElement {
  private _progress?: BudgetProgress;
  private _total = 0;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set progress(value: BudgetProgress) {
    this._progress = value;
    this.render();
  }

  set total(value: number) {
    this._total = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._progress) return;
    const p = this._progress;
    const pct = Math.min(p.percent * 100, 100);
    const state = p.over ? 'over' : p.percent > 0.85 ? 'warning' : '';
    this.shadowRoot!.innerHTML = `
      <div class="track">
        <div class="fill ${state}" style="width:${pct}%"></div>
      </div>
      <div class="label">
        <span>${formatCents(p.spent)} spent</span>
        <span>${formatCents(this._total)} budget</span>
      </div>
    `;
  }
}

customElements.define('budget-progress-bar', BudgetProgressBar);
