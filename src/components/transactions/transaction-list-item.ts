import css from './transaction-list-item.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { formatCents } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import type { Transaction } from '@/models/transaction';

export class TransactionListItem extends HTMLElement {
  private _transaction!: Transaction;
  private _categoryName = 'Uncategorized';
  private _categoryColor = '#9aa0a6';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set transaction(value: Transaction) {
    this._transaction = value;
    this.render();
  }

  set categoryName(value: string) {
    this._categoryName = value;
    this.render();
  }

  set categoryColor(value: string) {
    this._categoryColor = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._transaction) return;
    const t = this._transaction;
    const sign = t.type === 'income' ? '+' : '-';
    this.shadowRoot!.innerHTML = `
      <div class="row">
        <span class="swatch" style="background:${this._categoryColor}"></span>
        <div class="info">
          <div class="note">
            ${t.note || this._categoryName}
            ${t.recurringId ? '<app-icon name="repeat" class="recurring-badge"></app-icon>' : ''}
          </div>
          <div class="meta">${this._categoryName} · ${formatDate(t.date)}</div>
        </div>
        <span class="amount ${t.type}">${sign}${formatCents(t.amount)}</span>
        <div class="actions">
          <button type="button" class="edit-btn" aria-label="Edit"><app-icon name="edit"></app-icon></button>
          <button type="button" class="delete-btn" aria-label="Delete"><app-icon name="trash"></app-icon></button>
        </div>
      </div>
    `;
    this.shadowRoot!.querySelector('.edit-btn')!.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('edit', { detail: { id: t.id }, bubbles: true, composed: true }),
      );
    });
    this.shadowRoot!.querySelector('.delete-btn')!.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('delete', { detail: { id: t.id }, bubbles: true, composed: true }),
      );
    });
  }
}

customElements.define('transaction-list-item', TransactionListItem);
