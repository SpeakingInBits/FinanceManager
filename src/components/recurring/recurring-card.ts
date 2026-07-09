import css from './recurring-card.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { formatCents } from '@/utils/currency';
import { monthStart } from '@/utils/date';
import type { RecurringTransaction } from '@/models/recurring-transaction';

export class RecurringCard extends HTMLElement {
  private _rule!: RecurringTransaction;
  private _categoryName = 'Uncategorized';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set rule(value: RecurringTransaction) {
    this._rule = value;
    this.render();
  }

  set categoryName(value: string) {
    this._categoryName = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._rule) return;
    const r = this._rule;
    const root = this.shadowRoot!;
    const active = r.endDate === null || r.endDate > monthStart(Date.now());
    const sign = r.type === 'income' ? '+' : '-';

    root.innerHTML = `
      <div class="card">
        <div class="title">
          <span class="name">
            ${r.note || this._categoryName}
            <span class="badge">${active ? 'Active' : 'Stopped'}</span>
          </span>
          <span class="meta">${this._categoryName} · Monthly on day ${r.dayOfMonth}</span>
        </div>
        <span class="amount ${r.type}">${sign}${formatCents(r.amount)}</span>
        <div class="actions">
          ${
            active
              ? `
          <button type="button" class="edit-btn" aria-label="Edit"><app-icon name="edit"></app-icon></button>
          <button type="button" class="stop-btn" aria-label="Stop"><app-icon name="close"></app-icon></button>`
              : ''
          }
          <button type="button" class="delete-btn" aria-label="Delete"><app-icon name="trash"></app-icon></button>
        </div>
      </div>
    `;

    root.querySelector('.edit-btn')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('edit', { detail: { id: r.id }, bubbles: true, composed: true }),
      );
    });
    root.querySelector('.stop-btn')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('stop', { detail: { id: r.id }, bubbles: true, composed: true }),
      );
    });
    root.querySelector('.delete-btn')!.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('delete', { detail: { id: r.id }, bubbles: true, composed: true }),
      );
    });
  }
}

customElements.define('recurring-card', RecurringCard);
