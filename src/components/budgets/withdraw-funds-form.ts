import css from './withdraw-funds-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionSubmitDetail } from '@/state/events';
import { computeBudgetStats } from '@/utils/budget';
import { formatCents } from '@/utils/currency';
import type { Budget } from '@/models/budget';

/** Budgets with money to take out as of `referenceMonth`, paired with that spendable balance. */
export function withdrawableBudgets(referenceMonth: number): { budget: Budget; balance: number }[] {
  const { budgets, transactions } = appStore.getState();
  return budgets
    .map((budget) => ({
      budget,
      balance: computeBudgetStats(budget, transactions, referenceMonth).balance,
    }))
    .filter((b) => b.balance > 0);
}

/**
 * Moves money out of one budget's balance and back into general income, by creating a single
 * 'withdrawal' transaction. The amount can never exceed the chosen budget's balance, so a
 * withdrawal can bring the budget down to exactly 0 but never overdraw it.
 */
export class WithdrawFundsForm extends HTMLElement {
  private date = Date.now();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  /**
   * Epoch millis the withdrawal is dated with (a day inside the viewed month); setting it resets
   * the form for a fresh open, with balances computed as of that month.
   */
  set withdrawalDate(millis: number) {
    this.date = millis;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const root = this.shadowRoot!;
    const options = withdrawableBudgets(appStore.getState().selectedMonth);

    if (options.length === 0) {
      root.innerHTML = `
        <form>
          <p class="summary">None of your budgets have funds to withdraw.</p>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary cancel-btn">Close</button>
          </div>
        </form>
      `;
      this.wireCancel();
      return;
    }

    const balances = new Map(options.map((o) => [o.budget.id, o.balance]));
    root.innerHTML = `
      <form>
        <p class="summary">Move money out of a budget and back into this month's income, where you can spend it or allocate it elsewhere.</p>
        <div class="field">
          <label for="budget">Withdraw from</label>
          <select id="budget">
            ${options
              .map(
                (o) =>
                  `<option value="${o.budget.id}">${o.budget.name} (${formatCents(o.balance)})</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label for="amount">Amount</label>
          <amount-input id="amount"></amount-input>
        </div>
        <p class="remaining"></p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
          <button type="submit" class="btn withdraw-btn">Withdraw</button>
        </div>
      </form>
    `;

    const select = root.querySelector<HTMLSelectElement>('#budget')!;
    const amount = root.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
    const available = () => balances.get(select.value) ?? 0;
    const update = () => this.updateRemaining(available(), amount.valueCents);
    select.addEventListener('change', update);
    amount.addEventListener('input', update);
    update();
    this.wireCancel();

    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const cents = amount.valueCents;
      if (cents <= 0 || cents > available()) return;
      this.dispatchEvent(
        new CustomEvent<TransactionSubmitDetail>(AppEvents.TransactionSubmit, {
          detail: {
            input: {
              type: 'withdrawal',
              amount: cents,
              date: this.date,
              categoryId: null,
              subcategoryId: null,
              budgetId: select.value,
              note: '',
              recurrence: null,
              recurrenceEnd: null,
            },
          },
          bubbles: true,
          composed: true,
        }),
      );
      this.dispatchEvent(new CustomEvent('form-done', { bubbles: true, composed: true }));
    });
  }

  /** Shows what the chosen budget will have left and gates the submit button on it. */
  private updateRemaining(available: number, cents: number): void {
    const root = this.shadowRoot!;
    const left = available - cents;
    const remainingEl = root.querySelector('.remaining')!;
    remainingEl.textContent =
      left < 0 ? `Over by ${formatCents(-left)}` : `Left in budget: ${formatCents(left)}`;
    remainingEl.classList.toggle('over', left < 0);
    root.querySelector<HTMLButtonElement>('.withdraw-btn')!.disabled = cents <= 0 || left < 0;
  }

  private wireCancel(): void {
    this.shadowRoot!.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('form-cancel', { bubbles: true, composed: true }));
    });
  }
}

customElements.define('withdraw-funds-form', WithdrawFundsForm);
