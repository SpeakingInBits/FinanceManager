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
  private name = '';
  private description = '';
  private amountCents = 0;
  private startDate = '';
  private endDate = '';
  private categoryId: string | null = null;
  private subcategoryId: string | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set budget(value: Budget | null) {
    this.editing = value;
    this.periodType = value?.periodType ?? 'monthly';
    this.name = value?.name ?? '';
    this.description = value?.description ?? '';
    this.amountCents = value?.targetAmount ?? 0;
    this.startDate = millisToDateInput(value?.startDate ?? Date.now());
    this.endDate = value?.endDate ? millisToDateInput(value.endDate) : '';
    this.categoryId = value?.categoryId ?? null;
    this.subcategoryId = value?.subcategoryId ?? null;
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
    const { categories } = appStore.getState();
    const categoryOptions = categories.filter((c) => c.parentId === null);
    const subcategoryOptions = this.categoryId
      ? categories.filter((c) => c.parentId === this.categoryId)
      : [];
    const amountLabel = this.periodType === 'monthly' ? 'Monthly contribution target' : 'Savings goal';

    root.innerHTML = `
      <form>
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" value="${this.name}" required />
        </div>

        <div class="field">
          <label for="description">Description (optional)</label>
          <textarea id="description">${this.description}</textarea>
        </div>

        <div class="field">
          <label for="amount">${amountLabel}</label>
          <amount-input id="amount" value="${this.amountCents}"></amount-input>
        </div>

        <div class="type-toggle" role="group" aria-label="Period type">
          <button type="button" data-period="monthly" aria-pressed="${this.periodType === 'monthly'}">Monthly</button>
          <button type="button" data-period="one-time" aria-pressed="${this.periodType === 'one-time'}">One-time</button>
        </div>

        <div class="row">
          <div class="field">
            <label for="start">Start date</label>
            <input type="date" id="start" value="${this.startDate}" required />
          </div>
          <div class="field">
            <label for="end">End date (optional)</label>
            <input type="date" id="end" value="${this.endDate}" />
          </div>
        </div>

        <div class="field">
          <label for="category">Category (optional — leave blank for a general budget)</label>
          <select id="category">
            <option value="">General</option>
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
                  `<option value="${c.id}" ${c.id === this.subcategoryId ? 'selected' : ''}>${c.name}</option>`,
              )
              .join('')}
          </select>
        </div>`
            : ''
        }

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

    root.querySelector<HTMLInputElement>('#name')!.addEventListener('input', (e) => {
      this.name = (e.target as HTMLInputElement).value;
    });

    root.querySelector<HTMLTextAreaElement>('#description')!.addEventListener('input', (e) => {
      this.description = (e.target as HTMLTextAreaElement).value;
    });

    const amountEl = root.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
    amountEl.addEventListener('input', () => {
      this.amountCents = amountEl.valueCents;
    });

    root.querySelector<HTMLInputElement>('#start')!.addEventListener('input', (e) => {
      this.startDate = (e.target as HTMLInputElement).value;
    });

    root.querySelector<HTMLInputElement>('#end')!.addEventListener('input', (e) => {
      this.endDate = (e.target as HTMLInputElement).value;
    });

    root.querySelector<HTMLSelectElement>('#category')!.addEventListener('change', (e) => {
      this.categoryId = (e.target as HTMLSelectElement).value || null;
      this.subcategoryId = null;
      this.render();
    });

    root.querySelector<HTMLSelectElement>('#subcategory')?.addEventListener('change', (e) => {
      this.subcategoryId = (e.target as HTMLSelectElement).value || null;
    });

    root.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('form-cancel', { bubbles: true, composed: true }));
    });

    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = root.querySelector<HTMLInputElement>('#name')!;
      const descriptionEl = root.querySelector<HTMLTextAreaElement>('#description')!;
      const amountEl = root.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
      const startEl = root.querySelector<HTMLInputElement>('#start')!;
      const endEl = root.querySelector<HTMLInputElement>('#end')!;
      const categoryEl = root.querySelector<HTMLSelectElement>('#category')!;
      const subcategoryEl = root.querySelector<HTMLSelectElement>('#subcategory');

      this.dispatchEvent(
        new CustomEvent<BudgetSubmitDetail>(AppEvents.BudgetSubmit, {
          detail: {
            id: b?.id,
            input: {
              name: nameEl.value.trim(),
              description: descriptionEl.value.trim(),
              targetAmount: amountEl.valueCents,
              periodType: this.periodType,
              startDate: dateInputToMillis(startEl.value),
              endDate: endEl.value ? dateInputToMillis(endEl.value) : null,
              categoryId: categoryEl.value || null,
              subcategoryId: subcategoryEl?.value || null,
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
