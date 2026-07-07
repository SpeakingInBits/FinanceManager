import css from './category-node.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import type { Category } from '@/models/category';

export class CategoryNode extends HTMLElement {
  private _category!: Category;
  private _children: Category[] = [];
  private _all: Category[] = [];

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set category(value: Category) {
    this._category = value;
    this.render();
  }

  set allCategories(value: Category[]) {
    this._all = value;
    this._children = value.filter((c) => c.parentId === this._category?.id);
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._category) return;
    const root = this.shadowRoot!;
    root.innerHTML = `
      <div class="node">
        <span class="swatch" style="background:${this._category.color}"></span>
        <span class="name">${this._category.name}</span>
        <div class="actions">
          <button type="button" class="edit-btn" aria-label="Edit"><app-icon name="edit"></app-icon></button>
          <button type="button" class="delete-btn" aria-label="Delete"><app-icon name="trash"></app-icon></button>
        </div>
      </div>
      <div class="children"></div>
    `;

    root.querySelector('.edit-btn')!.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('edit', {
          detail: { id: this._category.id },
          bubbles: true,
          composed: true,
        }),
      );
    });
    root.querySelector('.delete-btn')!.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('delete', {
          detail: { id: this._category.id },
          bubbles: true,
          composed: true,
        }),
      );
    });

    const childrenEl = root.querySelector('.children')!;
    for (const child of this._children) {
      const node = document.createElement('category-node') as CategoryNode;
      node.category = child;
      node.allCategories = this._all;
      childrenEl.appendChild(node);
    }
  }
}

customElements.define('category-node', CategoryNode);
