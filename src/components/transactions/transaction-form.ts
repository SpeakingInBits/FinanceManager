import css from './transaction-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { millisToDateInput, dateInputToMillis } from '@/utils/date';
import type { Transaction, TransactionType } from '@/models/transaction';

export class TransactionForm extends HTMLElement {
  private unsubscribe?: () => void;
  private editing: Transaction | null = null;
  private type: TransactionType = 'expense';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set transaction(value: Transaction | null) {
    this.editing = value;
    this.type = value?.type ?? 'expense';
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
    const t = this.editing;
    const categoryOptions = categories.filter((c) => c.type === this.type);
    const budgetOptions = budgets.filter(
      (b) => b.categoryId === null || categoryOptions.some((c) => c.id === b.categoryId),
    );

    root.innerHTML = `
      <form>
        <div class="type-toggle" role="group" aria-label="Transaction type">
          <button type="button" data-type="expense" aria-pressed="${this.type === 'expense'}">Expense</button>
          <button type="button" data-type="income" aria-pressed="${this.type === 'income'}">Income</button>
        </div>

        <div class="field">
          <label for="amount">Amount</label>
          <amount-input id="amount" value="${t?.amount ?? 0}"></amount-input>
        </div>

        <div class="row">
          <div class="field">
            <label for="date">Date</label>
            <input type="date" id="date" value="${millisToDateInput(t?.date ?? Date.now())}" required />
          </div>
          <div class="field">
            <label for="category">Category</label>
            <select id="category">
              <option value="">Uncategorized</option>
              ${categoryOptions
                .map(
                  (c) =>
                    `<option value="${c.id}" ${c.id === t?.categoryId ? 'selected' : ''}>${c.name}</option>`,
                )
                .join('')}
            </select>
          </div>
        </div>

        <div class="field">
          <label for="budget">Budget</label>
          <select id="budget">
            <option value="">None</option>
            ${budgetOptions
              .map(
                (b) =>
                  `<option value="${b.id}" ${b.id === t?.budgetId ? 'selected' : ''}>${b.name}</option>`,
              )
              .join('')}
          </select>
        </div>

        <div class="field">
          <label for="note">Note</label>
          <textarea id="note">${t?.note ?? ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
          <button type="submit" class="btn">${t ? 'Save' : 'Add'}</button>
        </div>
      </form>
    `;

    root.querySelectorAll<HTMLButtonElement>('.type-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.type = btn.dataset.type as TransactionType;
        this.render();
      });
    });

    root.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('form-cancel', { bubbles: true, composed: true }));
    });

    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const amountEl = root.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
      const dateEl = root.querySelector<HTMLInputElement>('#date')!;
      const categoryEl = root.querySelector<HTMLSelectElement>('#category')!;
      const budgetEl = root.querySelector<HTMLSelectElement>('#budget')!;
      const noteEl = root.querySelector<HTMLTextAreaElement>('#note')!;

      this.dispatchEvent(
        new CustomEvent<TransactionSubmitDetail>(AppEvents.TransactionSubmit, {
          detail: {
            id: t?.id,
            input: {
              type: this.type,
              amount: amountEl.valueCents,
              date: dateInputToMillis(dateEl.value),
              categoryId: categoryEl.value || null,
              budgetId: budgetEl.value || null,
              note: noteEl.value.trim(),
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

customElements.define('transaction-form', TransactionForm);
