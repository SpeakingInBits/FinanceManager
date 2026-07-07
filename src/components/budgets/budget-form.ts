import css from './budget-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type BudgetSubmitDetail } from '@/state/events';
import { millisToDateInput, dateInputToMillis } from '@/utils/date';
import type { Budget, BudgetPeriodType } from '@/models/budget';

export class BudgetForm extends HTMLElement {
  private unsubscribe?: () => void;
  private editing: Budget | null = null;
  private periodType: BudgetPeriodType = 'monthly';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set budget(value: Budget | null) {
    this.editing = value;
    this.periodType = value?.periodType ?? 'monthly';
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
    const b = this.editing;
    const categories = appStore.getState().categories.filter((c) => c.type === 'expense');

    root.innerHTML = `
      <form>
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" value="${b?.name ?? ''}" required />
        </div>

        <div class="field">
          <label for="amount">Amount</label>
          <amount-input id="amount" value="${b?.amount ?? 0}"></amount-input>
        </div>

        <div class="type-toggle" role="group" aria-label="Period type">
          <button type="button" data-period="monthly" aria-pressed="${this.periodType === 'monthly'}">Monthly</button>
          <button type="button" data-period="one-time" aria-pressed="${this.periodType === 'one-time'}">One-time</button>
        </div>

        <div class="row">
          <div class="field">
            <label for="start">Start date</label>
            <input type="date" id="start" value="${millisToDateInput(b?.startDate ?? Date.now())}" required />
          </div>
          <div class="field">
            <label for="end">End date${this.periodType === 'monthly' ? ' (optional)' : ''}</label>
            <input type="date" id="end" value="${b?.endDate ? millisToDateInput(b.endDate) : ''}" ${this.periodType === 'one-time' ? 'required' : ''} />
          </div>
        </div>

        <div class="field">
          <label for="category">Category (optional — leave blank for a general budget)</label>
          <select id="category">
            <option value="">General</option>
            ${categories
              .map(
                (c) =>
                  `<option value="${c.id}" ${c.id === b?.categoryId ? 'selected' : ''}>${c.name}</option>`,
              )
              .join('')}
          </select>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
          <button type="submit" class="btn">${b ? 'Save' : 'Add'}</button>
        </div>
      </form>
    `;

    root.querySelectorAll<HTMLButtonElement>('.type-toggle button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.periodType = btn.dataset.period as BudgetPeriodType;
        this.render();
      });
    });

    root.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('form-cancel', { bubbles: true, composed: true }));
    });

    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = root.querySelector<HTMLInputElement>('#name')!;
      const amountEl = root.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
      const startEl = root.querySelector<HTMLInputElement>('#start')!;
      const endEl = root.querySelector<HTMLInputElement>('#end')!;
      const categoryEl = root.querySelector<HTMLSelectElement>('#category')!;

      this.dispatchEvent(
        new CustomEvent<BudgetSubmitDetail>(AppEvents.BudgetSubmit, {
          detail: {
            id: b?.id,
            input: {
              name: nameEl.value.trim(),
              amount: amountEl.valueCents,
              periodType: this.periodType,
              startDate: dateInputToMillis(startEl.value),
              endDate: endEl.value ? dateInputToMillis(endEl.value) : null,
              categoryId: categoryEl.value || null,
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

customElements.define('budget-form', BudgetForm);
