import css from './category-tree.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import type { Category, CategoryType } from '@/models/category';
import type { CategoryNode } from './category-node';

export class CategoryTree extends HTMLElement {
  private _categories: Category[] = [];
  private _type: CategoryType = 'expense';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set categories(value: Category[]) {
    this._categories = value;
    this.render();
  }

  set type(value: CategoryType) {
    this._type = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const root = this.shadowRoot!;
    const scoped = this._categories.filter((c) => c.type === this._type);
    const roots = scoped.filter((c) => c.parentId === null);
    if (roots.length === 0) {
      root.innerHTML = `<empty-state message="No ${this._type} categories yet" icon="tag"></empty-state>`;
      return;
    }
    root.innerHTML = '<div class="tree"></div>';
    const tree = root.querySelector('.tree')!;
    for (const category of roots) {
      const node = document.createElement('category-node') as CategoryNode;
      node.category = category;
      node.allCategories = scoped;
      tree.appendChild(node);
    }
  }
}

customElements.define('category-tree', CategoryTree);
