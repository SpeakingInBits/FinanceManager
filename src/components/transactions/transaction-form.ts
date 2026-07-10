import css from './transaction-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { millisToDateInput, dateInputToMillis } from '@/utils/date';
import { monthlyEquivalentAmount } from '@/utils/recurrence';
import { formatCents } from '@/utils/currency';
import type { Transaction, TransactionType } from '@/models/transaction';

export class TransactionForm extends HTMLElement {
  private unsubscribe?: () => void;
  private editing: Transaction | null = null;
  private type: TransactionType = 'expense';
  private recurrence: Transaction['recurrence'] = null;
  private amountCents = 0;
  private note = '';
  private dateValue = '';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set transaction(value: Transaction | null) {
    this.editing = value;
    this.type = value?.type ?? 'expense';
    this.recurrence = value?.recurrence ?? null;
    this.amountCents = value?.amount ?? 0;
    this.note = value?.note ?? '';
    this.dateValue = millisToDateInput(value?.date ?? Date.now());
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
          <amount-input id="amount" value="${this.amountCents}"></amount-input>
          ${
            this.recurrence === 'yearly'
              ? `<p class="hint">= ${formatCents(monthlyEquivalentAmount(this.amountCents, 'yearly'))}/month</p>`
              : ''
          }
        </div>

        <div class="field">
          <label for="recurrence">Repeats</label>
          <select id="recurrence">
            <option value="" ${this.recurrence === null ? 'selected' : ''}>Never (one-off)</option>
            <option value="monthly" ${this.recurrence === 'monthly' ? 'selected' : ''}>Monthly</option>
            <option value="yearly" ${this.recurrence === 'yearly' ? 'selected' : ''}>Yearly</option>
          </select>
        </div>

        <div class="row">
          <div class="field">
            <label for="date">${this.recurrence ? 'Start date' : 'Date'}</label>
            <input type="date" id="date" value="${this.dateValue}" required />
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
          <textarea id="note">${this.note}</textarea>
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

    const recurrenceEl = root.querySelector<HTMLSelectElement>('#recurrence')!;
    recurrenceEl.addEventListener('change', () => {
      this.recurrence = (recurrenceEl.value || null) as Transaction['recurrence'];
      this.render();
    });

    const amountEl = root.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
    amountEl.addEventListener('input', () => {
      this.amountCents = amountEl.valueCents;
      if (this.recurrence !== 'yearly') return;
      const hint = root.querySelector('.hint');
      if (hint) hint.textContent = `= ${formatCents(monthlyEquivalentAmount(amountEl.valueCents, 'yearly'))}/month`;
    });

    root.querySelector<HTMLInputElement>('#date')!.addEventListener('input', (e) => {
      this.dateValue = (e.target as HTMLInputElement).value;
    });

    root.querySelector<HTMLTextAreaElement>('#note')!.addEventListener('input', (e) => {
      this.note = (e.target as HTMLTextAreaElement).value;
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
              recurrence: this.recurrence,
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
