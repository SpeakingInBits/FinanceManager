import { appStore } from '@/state/app-store';
import { moveCategoryAction } from '@/state/actions';
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
        <category-tree></category-tree>
      </section>

      <modal-dialog heading="Add category" class="category-modal">
        <category-form></category-form>
      </modal-dialog>
    `;

    const tree = this.querySelector('category-tree') as CategoryTree;
    this.unsubscribe = appStore.subscribe((state) => {
      tree.categories = state.categories;
    });
    tree.categories = appStore.getState().categories;

    this.querySelector('.add-btn')!.addEventListener('click', () => this.openForm(null));

    this.addEventListener('edit', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const category = appStore.getState().categories.find((c) => c.id === id) ?? null;
      this.openForm(category);
    });

    this.addEventListener('add-child', (e) => {
      const { parentId } = (e as CustomEvent<{ parentId: string }>).detail;
      this.openForm(null, parentId);
    });

    this.addEventListener('reorder', (e) => {
      const { id, direction } = (e as CustomEvent<{ id: string; direction: 'up' | 'down' }>).detail;
      void moveCategoryAction(id, direction);
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

  private openForm(category: Category | null, presetParentId: string | null = null): void {
    const form = this.querySelector('category-form') as CategoryForm;
    form.category = category;
    if (!category && presetParentId) {
      form.presetParentId = presetParentId;
    }
    const modal = this.querySelector('.category-modal') as ModalDialog;
    modal.setAttribute('heading', category ? 'Edit category' : presetParentId ? 'Add subcategory' : 'Add category');
    modal.open();
  }

  private closeModal(): void {
    (this.querySelector('.category-modal') as ModalDialog)?.close();
  }
}

customElements.define('categories-view', CategoriesView);
