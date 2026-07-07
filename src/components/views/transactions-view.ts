import { appStore } from '@/state/app-store';
import type { TransactionModal } from '@/components/transactions/transaction-modal';

export class TransactionsView extends HTMLElement {
  connectedCallback(): void {
    this.className = 'view';
    this.innerHTML = `
      <div class="view-header">
        <h1>Transactions</h1>
        <button type="button" class="btn add-btn"><app-icon name="plus"></app-icon> Add</button>
      </div>
      <transaction-list></transaction-list>
      <transaction-modal></transaction-modal>
    `;

    this.querySelector('.add-btn')!.addEventListener('click', () => {
      (this.querySelector('transaction-modal') as TransactionModal).open(null);
    });

    this.addEventListener('edit-transaction', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const transaction = appStore.getState().transactions.find((t) => t.id === id);
      if (transaction) {
        (this.querySelector('transaction-modal') as TransactionModal).open(transaction);
      }
    });
  }
}

customElements.define('transactions-view', TransactionsView);
