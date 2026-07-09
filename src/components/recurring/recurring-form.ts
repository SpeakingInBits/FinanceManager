import css from './recurring-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type RecurringTransactionSubmitDetail } from '@/state/events';
import { monthStart } from '@/utils/date';
import type { RecurringTransaction } from '@/models/recurring-transaction';
import type { TransactionType } from '@/models/transaction';

export class RecurringForm extends HTMLElement {
  private unsubscribe?: () => void;
  private editing: RecurringTransaction | null = null;
  private type: TransactionType = 'expense';
  private categoryId: string | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set recurringTransaction(value: RecurringTransaction | null) {
    this.editing = value;
    this.type = value?.type ?? 'expense';
    this.categoryId = value?.categoryId ?? null;
    this.render();
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe(() => this.render());
    this.render();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private render(): void {
    const root = this.shadowRoot!;
    const { categories, budgets } = appStore.getState();
    const r = this.editing;
    const categoryOptions = categories.filter((c) => c.parentId === null);
    const subcategoryOptions = categories.filter((c) => c.parentId === this.categoryId);
    const budgetOptions = budgets;

    root.innerHTML = `
      <form>
        <div class="type-toggle" role="group" aria-label="Transaction type">
          <button type="button" data-type="expense" aria-pressed="${this.type === 'expense'}">Expense</button>
          <button type="button" data-type="income" aria-pressed="${this.type === 'income'}">Income</button>
        </div>

        <div class="row">
          <div class="field">
            <label for="amount">Amount</label>
            <amount-input id="amount" value="${r?.amount ?? 0}"></amount-input>
          </div>
          <div class="field">
            <label for="day">Day of month</label>
            <input type="number" id="day" min="1" max="31" value="${r?.dayOfMonth ?? 1}" required />
          </div>
        </div>

        <div class="field">
          <label for="category">Category</label>
          <select id="category">
            <option value="">Uncategorized</option>
            ${categoryOptions
              .map(
                (c) =>
                  `<option value="${c.id}" ${c.id === this.categoryId ? 'selected' : ''}>${c.name}</option>`,
              )
              .join('')}
          </select>
        </div>

        ${
          subcategoryOptions.length > 0
            ? `
        <div class="field">
          <label for="subcategory">Subcategory</label>
          <select id="subcategory">
            <option value="">None</option>
            ${subcategoryOptions
              .map(
                (c) =>
                  `<option value="${c.id}" ${c.id === r?.subcategoryId ? 'selected' : ''}>${c.name}</option>`,
              )
              .join('')}
          </select>
        </div>`
            : ''
        }

        <div class="field">
          <label for="budget">Budget</label>
          <select id="budget">
            <option value="">None</option>
            ${budgetOptions
              .map(
                (b) =>
                  `<option value="${b.id}" ${b.id === r?.budgetId ? 'selected' : ''}>${b.name}</option>`,
              )
              .join('')}
          </select>
        </div>

        <div class="field">
          <label for="note">Note</label>
          <textarea id="note">${r?.note ?? ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
          <button type="submit" class="btn">${r ? 'Save' : 'Add'}</button>
        </div>
      </form>
    `;

    root.querySelectorAll<HTMLButtonElement>('.type-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.type = btn.dataset.type as TransactionType;
        this.render();
      });
    });

    root.querySelector<HTMLSelectElement>('#category')!.addEventListener('change', (e) => {
      this.categoryId = (e.target as HTMLSelectElement).value || null;
      this.render();
    });

    root.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('form-cancel', { bubbles: true, composed: true }));
    });

    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const amountEl = root.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
      const dayEl = root.querySelector<HTMLInputElement>('#day')!;
      const categoryEl = root.querySelector<HTMLSelectElement>('#category')!;
      const subcategoryEl = root.querySelector<HTMLSelectElement>('#subcategory');
      const budgetEl = root.querySelector<HTMLSelectElement>('#budget')!;
      const noteEl = root.querySelector<HTMLTextAreaElement>('#note')!;

      this.dispatchEvent(
        new CustomEvent<RecurringTransactionSubmitDetail>(AppEvents.RecurringTransactionSubmit, {
          detail: {
            id: r?.id,
            input: {
              type: this.type,
              amount: amountEl.valueCents,
              dayOfMonth: Math.min(31, Math.max(1, Number(dayEl.value) || 1)),
              categoryId: categoryEl.value || null,
              subcategoryId: subcategoryEl?.value || null,
              budgetId: budgetEl.value || null,
              note: noteEl.value.trim(),
              startDate: r?.startDate ?? monthStart(Date.now()),
              endDate: r?.endDate ?? null,
              lastGeneratedThrough: r?.lastGeneratedThrough ?? null,
              replacesId: r?.replacesId ?? null,
            },
          },
          bubbles: true,
          composed: true,
        }),
      );
      this.dispatchEvent(new CustomEvent('form-done', { bubbles: true, composed: true }));
    });
  }
}

customElements.define('recurring-form', RecurringForm);
