import type { Transaction } from '@/models/transaction';
import type { ModalDialog } from '@/components/shared/modal-dialog';
import type { TransactionForm } from './transaction-form';

export class TransactionModal extends HTMLElement {
  connectedCallback(): void {
    if (this.querySelector('modal-dialog')) return;
    this.innerHTML = `
      <modal-dialog heading="Transaction">
        <transaction-form></transaction-form>
      </modal-dialog>
    `;
    this.addEventListener('form-done', () => this.close());
    this.addEventListener('form-cancel', () => this.close());
  }

  open(transaction: Transaction | null = null): void {
    const form = this.querySelector('transaction-form') as TransactionForm;
    form.transaction = transaction;
    const dialog = this.querySelector('modal-dialog') as ModalDialog;
    dialog.setAttribute('heading', transaction ? 'Edit transaction' : 'Add transaction');
    dialog.open();
  }

  close(): void {
    (this.querySelector('modal-dialog') as ModalDialog)?.close();
  }
}

customElements.define('transaction-modal', TransactionModal);
