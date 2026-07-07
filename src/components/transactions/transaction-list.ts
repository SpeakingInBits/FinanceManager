import css from './transaction-list.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionDeleteDetail } from '@/state/events';
import type { Transaction } from '@/models/transaction';
import type { Category } from '@/models/category';

export class TransactionList extends HTMLElement {
  private unsubscribe?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe((state) =>
      this.render(state.transactions, state.categories),
    );
    const state = appStore.getState();
    this.render(state.transactions, state.categories);

    this.shadowRoot!.addEventListener('delete', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (confirm('Delete this transaction?')) {
        this.dispatchEvent(
          new CustomEvent<TransactionDeleteDetail>(AppEvents.TransactionDelete, {
            detail: { id },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    this.shadowRoot!.addEventListener('edit', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      this.dispatchEvent(
        new CustomEvent('edit-transaction', { detail: { id }, bubbles: true, composed: true }),
      );
    });
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private render(transactions: Transaction[], categories: Category[]): void {
    const root = this.shadowRoot!;
    if (transactions.length === 0) {
      root.innerHTML = `<empty-state message="No transactions yet" icon="list"></empty-state>`;
      return;
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    const sorted = [...transactions].sort((a, b) => b.date - a.date);
    root.innerHTML = `<div class="list"></div>`;
    const list = root.querySelector('.list')!;
    for (const t of sorted) {
      const item = document.createElement('transaction-list-item') as HTMLElement & {
        transaction: Transaction;
        categoryName: string;
        categoryColor: string;
      };
      const category = t.categoryId ? byId.get(t.categoryId) : undefined;
      item.transaction = t;
      item.categoryName = category?.name ?? 'Uncategorized';
      item.categoryColor = category?.color ?? '#9aa0a6';
      list.appendChild(item);
    }
  }
}

customElements.define('transaction-list', TransactionList);
