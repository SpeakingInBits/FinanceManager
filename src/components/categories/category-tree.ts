import css from './category-tree.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { sortCategories } from '@/utils/category';
import type { Category } from '@/models/category';
import type { CategoryNode } from './category-node';

export class CategoryTree extends HTMLElement {
  private _categories: Category[] = [];
  private _collapsedIds = new Set<string>();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
    root.addEventListener('toggle-collapse', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (this._collapsedIds.has(id)) {
        this._collapsedIds.delete(id);
      } else {
        this._collapsedIds.add(id);
      }
      this.render();
    });
  }

  set categories(value: Category[]) {
    this._categories = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const root = this.shadowRoot!;
    const roots = sortCategories(this._categories.filter((c) => c.parentId === null));
    if (roots.length === 0) {
      root.innerHTML = '<empty-state message="No categories yet" icon="tag"></empty-state>';
      return;
    }
    root.innerHTML = '<div class="tree"></div>';
    const tree = root.querySelector('.tree')!;
    roots.forEach((category, i) => {
      const node = document.createElement('category-node') as CategoryNode;
      node.category = category;
      node.allCategories = this._categories;
      node.collapsed = this._collapsedIds.has(category.id);
      node.position = { index: i, count: roots.length };
      tree.appendChild(node);
    });
  }
}

customElements.define('category-tree', CategoryTree);
