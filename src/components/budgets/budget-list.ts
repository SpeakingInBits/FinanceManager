import css from './budget-list.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import type { Budget } from '@/models/budget';
import type { Category } from '@/models/category';
import type { Transaction } from '@/models/transaction';
import type { BudgetCard } from './budget-card';

export class BudgetList extends HTMLElement {
  private unsubscribe?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe((state) =>
      this.render(state.budgets, state.categories, state.transactions),
    );
    const state = appStore.getState();
    this.render(state.budgets, state.categories, state.transactions);
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private render(budgets: Budget[], categories: Category[], transactions: Transaction[]): void {
    const root = this.shadowRoot!;
    if (budgets.length === 0) {
      root.innerHTML = `<empty-state message="No budgets yet" icon="wallet"></empty-state>`;
      return;
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    root.innerHTML = `<div class="list"></div>`;
    const list = root.querySelector('.list')!;
    for (const b of budgets) {
      const card = document.createElement('budget-card') as BudgetCard;
      card.budget = b;
      const categoryName = b.categoryId ? (byId.get(b.categoryId)?.name ?? 'General') : 'General';
      const subcategoryName = b.subcategoryId ? byId.get(b.subcategoryId)?.name : undefined;
      card.categoryName = subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;
      card.transactions = transactions;
      list.appendChild(card);
    }
  }
}

customElements.define('budget-list', BudgetList);
