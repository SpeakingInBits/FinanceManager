import css from './transaction-list.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type TransactionDeleteDetail } from '@/state/events';
import { occurrencesForMonth, type MonthlyOccurrence } from '@/utils/recurrence';
import type { Category } from '@/models/category';

export class TransactionList extends HTMLElement {
  private unsubscribe?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe(() => this.renderFromState());
    this.renderFromState();

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

  private renderFromState(): void {
    const { transactions, categories, selectedMonth } = appStore.getState();
    this.render(occurrencesForMonth(transactions, selectedMonth), categories);
  }

  private render(occurrences: MonthlyOccurrence[], categories: Category[]): void {
    const root = this.shadowRoot!;
    if (occurrences.length === 0) {
      root.innerHTML = `<empty-state message="No transactions this month" icon="list"></empty-state>`;
      return;
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    const sorted = [...occurrences].sort((a, b) => b.displayDate - a.displayDate);
    root.innerHTML = `<div class="list"></div>`;
    const list = root.querySelector('.list')!;
    for (const occurrence of sorted) {
      const { transaction: t } = occurrence;
      const item = document.createElement('transaction-list-item') as HTMLElement & {
        occurrence: MonthlyOccurrence;
        categoryName: string;
        categoryColor: string;
      };
      const category = t.categoryId ? byId.get(t.categoryId) : undefined;
      item.occurrence = occurrence;
      item.categoryName = category?.name ?? 'Uncategorized';
      item.categoryColor = category?.color ?? '#9aa0a6';
      list.appendChild(item);
    }
  }
}

customElements.define('transaction-list', TransactionList);
