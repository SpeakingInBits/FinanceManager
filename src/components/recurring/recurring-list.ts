import css from './recurring-list.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import type { RecurringTransaction } from '@/models/recurring-transaction';
import type { Category } from '@/models/category';
import type { RecurringCard } from './recurring-card';

export class RecurringList extends HTMLElement {
  private unsubscribe?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe((state) =>
      this.render(state.recurringTransactions, state.categories),
    );
    const state = appStore.getState();
    this.render(state.recurringTransactions, state.categories);
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private render(rules: RecurringTransaction[], categories: Category[]): void {
    const root = this.shadowRoot!;
    // Hide rules superseded by a later edit (a new version was created for them); keep
    // manually-stopped rules (no successor) visible as a deliberate terminal state.
    const visible = rules.filter((r) => !rules.some((other) => other.replacesId === r.id));

    if (visible.length === 0) {
      root.innerHTML = `<empty-state message="No recurring transactions yet" icon="repeat"></empty-state>`;
      return;
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    root.innerHTML = `<div class="list"></div>`;
    const list = root.querySelector('.list')!;
    for (const r of visible) {
      const card = document.createElement('recurring-card') as RecurringCard;
      card.rule = r;
      card.categoryName = r.categoryId ? (byId.get(r.categoryId)?.name ?? 'Uncategorized') : 'Uncategorized';
      list.appendChild(card);
    }
  }
}

customElements.define('recurring-list', RecurringList);
