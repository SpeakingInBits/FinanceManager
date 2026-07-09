import { appStore } from '@/state/app-store';
import {
  AppEvents,
  type RecurringTransactionDeleteDetail,
  type RecurringTransactionStopDetail,
} from '@/state/events';
import type { ModalDialog } from '@/components/shared/modal-dialog';
import type { RecurringForm } from '@/components/recurring/recurring-form';
import type { RecurringTransaction } from '@/models/recurring-transaction';

export class RecurringView extends HTMLElement {
  connectedCallback(): void {
    this.className = 'view';
    this.innerHTML = `
      <div class="view-header">
        <h1>Recurring</h1>
        <button type="button" class="btn add-btn"><app-icon name="plus"></app-icon> Add</button>
      </div>
      <recurring-list></recurring-list>
      <modal-dialog heading="Add recurring transaction" class="recurring-modal">
        <recurring-form></recurring-form>
      </modal-dialog>
    `;

    this.querySelector('.add-btn')!.addEventListener('click', () => this.openForm(null));

    this.addEventListener('edit', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const rule = appStore.getState().recurringTransactions.find((r) => r.id === id) ?? null;
      this.openForm(rule);
    });

    this.addEventListener('stop', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (confirm('Stop this recurring rule? It will no longer generate new transactions.')) {
        this.dispatchEvent(
          new CustomEvent<RecurringTransactionStopDetail>(AppEvents.RecurringTransactionStop, {
            detail: { id },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    this.addEventListener('delete', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (confirm('Delete this recurring rule? Already-generated transactions will not be affected.')) {
        this.dispatchEvent(
          new CustomEvent<RecurringTransactionDeleteDetail>(AppEvents.RecurringTransactionDelete, {
            detail: { id },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    this.addEventListener('form-done', () => this.closeModal());
    this.addEventListener('form-cancel', () => this.closeModal());
  }

  private openForm(rule: RecurringTransaction | null): void {
    const form = this.querySelector('recurring-form') as RecurringForm;
    form.recurringTransaction = rule;
    const modal = this.querySelector('.recurring-modal') as ModalDialog;
    modal.setAttribute('heading', rule ? 'Edit recurring transaction' : 'Add recurring transaction');
    modal.open();
  }

  private closeModal(): void {
    (this.querySelector('.recurring-modal') as ModalDialog)?.close();
  }
}

customElements.define('recurring-view', RecurringView);
