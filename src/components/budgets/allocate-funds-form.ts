import css from './allocate-funds-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { formatCents } from '@/utils/currency';

/**
 * Distributes the selected month's unallocated income ("Net after allocations") across budgets
 * by creating one allocation (fill) transaction per budget with a non-zero amount. The total
 * entered can never exceed the funds available, so allocating can bring Net after allocations
 * down to exactly 0 but never below.
 */
export class AllocateFundsForm extends HTMLElement {
  private available = 0;
  private date = Date.now();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  /** Cents available to allocate; setting it resets the form for a fresh open. */
  set availableFunds(cents: number) {
    this.available = cents;
    this.render();
  }

  /** Epoch millis the created allocations are dated with (a day inside the viewed month). */
  set allocationDate(millis: number) {
    this.date = millis;
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const root = this.shadowRoot!;
    const { budgets } = appStore.getState();

    if (budgets.length === 0) {
      root.innerHTML = `
        <form>
          <p class="summary">Create a budget first, then fill it from here.</p>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary cancel-btn">Close</button>
          </div>
        </form>
      `;
      this.wireCancel();
      return;
    }

    root.innerHTML = `
      <form>
        <p class="summary">Spread this month's unallocated income across your budgets. Leave a budget at $0.00 to skip it.</p>
        ${budgets
          .map(
            (b, i) => `
        <div class="budget-row">
          <label for="alloc-${i}">${b.name}</label>
          <amount-input id="alloc-${i}" data-budget-id="${b.id}"></amount-input>
        </div>`,
          )
          .join('')}
        <p class="remaining"></p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
          <button type="submit" class="btn allocate-btn">Allocate</button>
        </div>
      </form>
    `;

    const inputs = [...root.querySelectorAll<HTMLElement & { valueCents: number }>('amount-input')];
    inputs.forEach((input) => input.addEventListener('input', () => this.updateRemaining()));
    this.updateRemaining();
    this.wireCancel();

    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const total = inputs.reduce((s, input) => s + input.valueCents, 0);
      if (total <= 0 || total > this.available) return;

      for (const input of inputs) {
        if (input.valueCents <= 0) continue;
        this.dispatchEvent(
          new CustomEvent<TransactionSubmitDetail>(AppEvents.TransactionSubmit, {
            detail: {
              input: {
                type: 'allocation',
                amount: input.valueCents,
                date: this.date,
                categoryId: null,
                subcategoryId: null,
                budgetId: input.dataset.budgetId!,
                note: '',
                recurrence: null,
                recurrenceEnd: null,
              },
            },
            bubbles: true,
            composed: true,
          }),
        );
      }
      this.dispatchEvent(new CustomEvent('form-done', { bubbles: true, composed: true }));
    });
  }

  /** Recomputes the "left to allocate" line and gates the submit button on it. */
  private updateRemaining(): void {
    const root = this.shadowRoot!;
    const inputs = [...root.querySelectorAll<HTMLElement & { valueCents: number }>('amount-input')];
    const total = inputs.reduce((s, input) => s + input.valueCents, 0);
    const left = this.available - total;

    const remainingEl = root.querySelector('.remaining')!;
    remainingEl.textContent =
      left < 0 ? `Over by ${formatCents(-left)}` : `Left to allocate: ${formatCents(left)}`;
    remainingEl.classList.toggle('over', left < 0);

    root.querySelector<HTMLButtonElement>('.allocate-btn')!.disabled = total <= 0 || left < 0;
  }

  private wireCancel(): void {
    this.shadowRoot!.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('form-cancel', { bubbles: true, composed: true }));
    });
  }
}

customElements.define('allocate-funds-form', AllocateFundsForm);
