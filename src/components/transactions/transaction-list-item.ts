import css from './transaction-list-item.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { formatCents } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import type { MonthlyOccurrence } from '@/utils/recurrence';

const RECURRENCE_LABEL = { monthly: 'Monthly', yearly: 'Yearly' } as const;

export class TransactionListItem extends HTMLElement {
  private _occurrence!: MonthlyOccurrence;
  private _categoryName = 'Uncategorized';
  private _categoryColor = '#9aa0a6';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set occurrence(value: MonthlyOccurrence) {
    this._occurrence = value;
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
    if (!this._occurrence) return;
    const { transaction: t, displayDate, displayAmount } = this._occurrence;
    const sign = t.type === 'income' ? '+' : '-';
    const recurrenceMeta = t.recurrence
      ? ` · ${RECURRENCE_LABEL[t.recurrence]} (${formatCents(t.amount)}/${t.recurrence === 'yearly' ? 'yr' : 'mo'})`
      : '';
    this.shadowRoot!.innerHTML = `
      <div class="row">
        <span class="swatch" style="background:${this._categoryColor}"></span>
        <div class="info">
          <div class="note">${t.note || this._categoryName}</div>
          <div class="meta">${this._categoryName} · ${formatDate(displayDate)}${recurrenceMeta}</div>
        </div>
        <span class="amount ${t.type}">${sign}${formatCents(displayAmount)}</span>
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
