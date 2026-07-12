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
    root.innerHTML = `<div class="list"></div>`;
    const list = root.querySelector('.list')!;

    // Top-level split: recurring transactions carry a non-null `recurrence`, one-offs don't.
    const groups: [string, MonthlyOccurrence[]][] = [
      ['Recurring', occurrences.filter((o) => o.transaction.recurrence !== null)],
      ['One-time', occurrences.filter((o) => o.transaction.recurrence === null)],
    ];
    for (const [title, groupOccurrences] of groups) {
      if (groupOccurrences.length === 0) continue;
      const section = document.createElement('section');
      section.className = 'group';
      const header = document.createElement('h2');
      header.className = 'group-title';
      header.textContent = title;
      section.appendChild(header);
      this.appendCategoryGroups(section, groupOccurrences, byId);
      list.appendChild(section);
    }
  }

  /** Groups occurrences by top-level category (Uncategorized last), each with its own header. */
  private appendCategoryGroups(
    container: HTMLElement,
    occurrences: MonthlyOccurrence[],
    byId: Map<string, Category>,
  ): void {
    const byCategory = new Map<string, MonthlyOccurrence[]>();
    for (const o of occurrences) {
      const key = o.transaction.categoryId ?? UNCATEGORIZED;
      (byCategory.get(key) ?? byCategory.set(key, []).get(key)!).push(o);
    }

    const entries = [...byCategory.entries()].sort(([a], [b]) =>
      compareNames(categoryName(a, byId), categoryName(b, byId), a === UNCATEGORIZED, b === UNCATEGORIZED),
    );

    for (const [key, categoryOccurrences] of entries) {
      const category = key === UNCATEGORIZED ? undefined : byId.get(key);
      const group = document.createElement('div');
      group.className = 'category-group';
      const header = document.createElement('h3');
      header.className = 'category-title';
      header.innerHTML = `<span class="swatch" style="background:${category?.color ?? UNCATEGORIZED_COLOR}"></span>${categoryName(key, byId)}`;
      group.appendChild(header);
      this.appendSubcategoryGroups(group, categoryOccurrences, byId);
      container.appendChild(group);
    }
  }

  /**
   * Within a category, groups by subcategory. Direct (no-subcategory) transactions list straight
   * under the category header when no real subcategories are present, otherwise under an "Other"
   * subheader — mirroring the pie chart's breakdown.
   */
  private appendSubcategoryGroups(
    container: HTMLElement,
    occurrences: MonthlyOccurrence[],
    byId: Map<string, Category>,
  ): void {
    const bySubcategory = new Map<string, MonthlyOccurrence[]>();
    for (const o of occurrences) {
      const key = o.transaction.subcategoryId ?? NO_SUBCATEGORY;
      (bySubcategory.get(key) ?? bySubcategory.set(key, []).get(key)!).push(o);
    }
    const hasRealSubcategory = [...bySubcategory.keys()].some((k) => k !== NO_SUBCATEGORY);

    const entries = [...bySubcategory.entries()].sort(([a], [b]) =>
      compareNames(categoryName(a, byId), categoryName(b, byId), a === NO_SUBCATEGORY, b === NO_SUBCATEGORY),
    );

    for (const [key, subOccurrences] of entries) {
      if (key === NO_SUBCATEGORY && !hasRealSubcategory) {
        this.appendItems(container, subOccurrences, byId);
        continue;
      }
      const group = document.createElement('div');
      group.className = 'subcategory-group';
      const header = document.createElement('h4');
      header.className = 'subcategory-title';
      header.textContent = key === NO_SUBCATEGORY ? 'Other' : (byId.get(key)?.name ?? 'Unknown');
      group.appendChild(header);
      this.appendItems(group, subOccurrences, byId);
      container.appendChild(group);
    }
  }

  /** Appends transaction-list-item elements for the given occurrences, newest first. */
  private appendItems(
    container: HTMLElement,
    occurrences: MonthlyOccurrence[],
    byId: Map<string, Category>,
  ): void {
    const sorted = [...occurrences].sort((a, b) => b.displayDate - a.displayDate);
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
      item.categoryColor = category?.color ?? UNCATEGORIZED_COLOR;
      container.appendChild(item);
    }
  }
}

const UNCATEGORIZED = '__uncategorized__';
const NO_SUBCATEGORY = '__none__';
const UNCATEGORIZED_COLOR = '#9aa0a6';

function categoryName(key: string, byId: Map<string, Category>): string {
  if (key === UNCATEGORIZED) return 'Uncategorized';
  if (key === NO_SUBCATEGORY) return 'Other';
  return byId.get(key)?.name ?? 'Unknown';
}

/** Alphabetical by name, but always sorts the catch-all bucket (Uncategorized / Other) last. */
function compareNames(a: string, b: string, aLast: boolean, bLast: boolean): number {
  if (aLast !== bLast) return aLast ? 1 : -1;
  return a.localeCompare(b);
}

customElements.define('transaction-list', TransactionList);
