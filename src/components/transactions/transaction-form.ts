import css from './transaction-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { millisToDateInput, dateInputToMillis, startOfMonth, formatMonthYear } from '@/utils/date';
import { monthlyEquivalentAmount } from '@/utils/recurrence';
import { formatCents } from '@/utils/currency';
import type { Transaction, TransactionType } from '@/models/transaction';

export class TransactionForm extends HTMLElement {
  private unsubscribe?: () => void;
  private editing: Transaction | null = null;
  private type: TransactionType = 'expense';
  private categoryId: string | null = null;
  private budgetId: string | null = null;
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
    this.categoryId = value?.categoryId ?? null;
    this.budgetId = value?.budgetId ?? null;
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
    const { categories, budgets, selectedMonth } = appStore.getState();
    const t = this.editing;
    // Editing the amount of a recurring transaction that already occurred in earlier months only
    // applies from the viewed month on (the record is split to keep history); tell the user.
    const amountSplits =
      t !== null &&
      t.recurrence !== null &&
      startOfMonth(t.date) < selectedMonth &&
      (t.recurrenceEnd === null || selectedMonth < t.recurrenceEnd);
    const categoryOptions = categories.filter((c) => c.parentId === null);
    const subcategoryOptions = this.categoryId
      ? categories.filter((c) => c.parentId === this.categoryId)
      : [];
    const budgetOptions = budgets;

    // Allocations move money from logged income into a budget: no category, budget required.
    // Income is plain earnings: no budget link. Expenses may optionally spend from a budget.
    const isAllocation = this.type === 'allocation';

    root.innerHTML = `
      <form>
        <div class="type-toggle" role="group" aria-label="Transaction type">
          <button type="button" data-type="expense" aria-pressed="${this.type === 'expense'}">Expense</button>
          <button type="button" data-type="income" aria-pressed="${this.type === 'income'}">Income</button>
          <button type="button" data-type="allocation" aria-pressed="${isAllocation}">Fill budget</button>
        </div>

        <div class="field">
          <label for="amount">Amount</label>
          <amount-input id="amount" value="${this.amountCents}"></amount-input>
          ${
            this.recurrence === 'yearly'
              ? `<p class="hint">= ${formatCents(monthlyEquivalentAmount(this.amountCents, 'yearly'))}/month</p>`
              : ''
          }
          ${
            amountSplits
              ? `<p class="hint">A new amount applies from ${formatMonthYear(selectedMonth)} on; earlier months keep ${formatCents(t.amount)}.</p>`
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
          ${
            isAllocation
              ? ''
              : `
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
          </div>`
          }
        </div>

        ${
          !isAllocation && subcategoryOptions.length > 0
            ? `
        <div class="field">
          <label for="subcategory">Subcategory</label>
          <select id="subcategory">
            <option value="">None</option>
            ${subcategoryOptions
              .map(
                (c) =>
                  `<option value="${c.id}" ${c.id === t?.subcategoryId ? 'selected' : ''}>${c.name}</option>`,
              )
              .join('')}
          </select>
        </div>`
            : ''
        }

        ${
          this.type === 'income'
            ? ''
            : `
        <div class="field">
          <label for="budget">${isAllocation ? 'Fill budget' : 'Budget'}</label>
          <select id="budget" ${isAllocation ? 'required' : ''}>
            <option value="">${isAllocation ? 'Select a budget' : 'None'}</option>
            ${budgetOptions
              .map(
                (b) =>
                  `<option value="${b.id}" ${b.id === this.budgetId ? 'selected' : ''}>${b.name}</option>`,
              )
              .join('')}
          </select>
        </div>`
        }

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

    root.querySelector<HTMLSelectElement>('#category')?.addEventListener('change', (e) => {
      this.categoryId = (e.target as HTMLSelectElement).value || null;
      this.render();
    });

    root.querySelector<HTMLSelectElement>('#budget')?.addEventListener('change', (e) => {
      this.budgetId = (e.target as HTMLSelectElement).value || null;
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
      const categoryEl = root.querySelector<HTMLSelectElement>('#category');
      const subcategoryEl = root.querySelector<HTMLSelectElement>('#subcategory');
      const budgetEl = root.querySelector<HTMLSelectElement>('#budget');
      const noteEl = root.querySelector<HTMLTextAreaElement>('#note')!;

      const budgetId = budgetEl?.value || null;
      // A fill has to land somewhere; the `required` attribute covers browsers, this covers
      // programmatic submits.
      if (this.type === 'allocation' && budgetId === null) return;

      this.dispatchEvent(
        new CustomEvent<TransactionSubmitDetail>(AppEvents.TransactionSubmit, {
          detail: {
            id: t?.id,
            input: {
              type: this.type,
              amount: amountEl.valueCents,
              date: dateInputToMillis(dateEl.value),
              categoryId: categoryEl?.value || null,
              subcategoryId: subcategoryEl?.value || null,
              budgetId: this.type === 'income' ? null : budgetId,
              note: noteEl.value.trim(),
              recurrence: this.recurrence,
              recurrenceEnd: this.recurrence === null ? null : (t?.recurrenceEnd ?? null),
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
