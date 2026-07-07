import { appStore } from '@/state/app-store';
import { AppEvents, type CategoryDeleteDetail } from '@/state/events';
import type { ModalDialog } from '@/components/shared/modal-dialog';
import type { CategoryForm } from '@/components/categories/category-form';
import type { CategoryTree } from '@/components/categories/category-tree';
import type { Category } from '@/models/category';

export class CategoriesView extends HTMLElement {
  private unsubscribe?: () => void;

  connectedCallback(): void {
    this.className = 'view';
    this.innerHTML = `
      <div class="view-header">
        <h1>Categories</h1>
        <button type="button" class="btn add-btn"><app-icon name="plus"></app-icon> Add</button>
      </div>

      <section class="card">
        <h2>Expense</h2>
        <category-tree class="expense-tree"></category-tree>
      </section>

      <section class="card">
        <h2>Income</h2>
        <category-tree class="income-tree"></category-tree>
      </section>

      <modal-dialog heading="Add category" class="category-modal">
        <category-form></category-form>
      </modal-dialog>
    `;

    const expenseTree = this.querySelector('.expense-tree') as CategoryTree;
    const incomeTree = this.querySelector('.income-tree') as CategoryTree;
    expenseTree.type = 'expense';
    incomeTree.type = 'income';
    this.unsubscribe = appStore.subscribe((state) => {
      expenseTree.categories = state.categories;
      incomeTree.categories = state.categories;
    });
    const state = appStore.getState();
    expenseTree.categories = state.categories;
    incomeTree.categories = state.categories;

    this.querySelector('.add-btn')!.addEventListener('click', () => this.openForm(null));

    this.addEventListener('edit', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const category = appStore.getState().categories.find((c) => c.id === id) ?? null;
      this.openForm(category);
    });

    this.addEventListener('delete', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const hasChildren = appStore.getState().categories.some((c) => c.parentId === id);
      if (hasChildren) {
        alert('Move or delete subcategories first.');
        return;
      }
      if (confirm('Delete this category?')) {
        this.dispatchEvent(
          new CustomEvent<CategoryDeleteDetail>(AppEvents.CategoryDelete, {
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

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private openForm(category: Category | null): void {
    const form = this.querySelector('category-form') as CategoryForm;
    form.category = category;
    const modal = this.querySelector('.category-modal') as ModalDialog;
    modal.setAttribute('heading', category ? 'Edit category' : 'Add category');
    modal.open();
  }

  private closeModal(): void {
    (this.querySelector('.category-modal') as ModalDialog)?.close();
  }
}

customElements.define('categories-view', CategoriesView);
