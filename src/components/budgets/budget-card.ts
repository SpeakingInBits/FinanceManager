import css from './budget-card.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { computeBudgetStats } from '@/utils/budget';
import type { Budget } from '@/models/budget';
import type { Transaction } from '@/models/transaction';
import type { BudgetProgressBar } from './budget-progress-bar';

export class BudgetCard extends HTMLElement {
  private _budget!: Budget;
  private _categoryName = 'General';
  private _transactions: Transaction[] = [];

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set budget(value: Budget) {
    this._budget = value;
    this.render();
  }

  set categoryName(value: string) {
    this._categoryName = value;
    this.render();
  }

  set transactions(value: Transaction[]) {
    this._transactions = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._budget) return;
    const b = this._budget;
    const root = this.shadowRoot!;
    const periodLabel = b.periodType === 'monthly' ? 'Monthly' : 'One-time';
    root.innerHTML = `
      <div class="card">
        <div class="top">
          <div class="title">
            <span class="name">${b.name}</span>
            <span class="meta">${periodLabel} · ${this._categoryName}</span>
          </div>
          <div class="actions">
            <button type="button" class="edit-btn" aria-label="Edit"><app-icon name="edit"></app-icon></button>
            <button type="button" class="delete-btn" aria-label="Delete"><app-icon name="trash"></app-icon></button>
          </div>
        </div>
        <budget-progress-bar></budget-progress-bar>
      </div>
    `;

    const bar = root.querySelector('budget-progress-bar') as BudgetProgressBar;
    bar.stats = computeBudgetStats(b, this._transactions);

    root.querySelector('.edit-btn')!.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('edit', { detail: { id: b.id }, bubbles: true, composed: true }),
      );
    });
    root.querySelector('.delete-btn')!.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('delete', { detail: { id: b.id }, bubbles: true, composed: true }),
      );
    });
  }
}

customElements.define('budget-card', BudgetCard);
