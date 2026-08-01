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
  private _budgetName = '';

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

  set budgetName(value: string) {
    this._budgetName = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._occurrence) return;
    const { transaction: t, displayDate, displayAmount } = this._occurrence;
    // Allocations move money into a budget rather than in/out of the ledger, so they read as a
    // transfer (→) labeled with the target budget instead of a category.
    const isAllocation = t.type === 'allocation';
    const sign = isAllocation ? '→' : t.type === 'income' ? '+' : '-';
    const label = isAllocation ? this._budgetName || 'Budget' : this._categoryName;
    const meta = isAllocation ? `Fill: ${this._budgetName || 'Budget'}` : this._categoryName;
    const recurrenceMeta = t.recurrence
      ? ` · ${RECURRENCE_LABEL[t.recurrence]} (${formatCents(t.amount)}/${t.recurrence === 'yearly' ? 'yr' : 'mo'})`
      : '';
    this.shadowRoot!.innerHTML = `
      <div class="row">
        <span class="swatch" style="background:${this._categoryColor}"></span>
        <div class="info">
          <div class="note">${t.note || label}</div>
          <div class="meta">${meta} · ${formatDate(displayDate)}${recurrenceMeta}</div>
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
