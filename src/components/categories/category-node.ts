import css from './category-node.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { sortCategories } from '@/utils/category';
import type { Category } from '@/models/category';

interface Position {
  index: number;
  count: number;
}

export class CategoryNode extends HTMLElement {
  private _category!: Category;
  private _children: Category[] = [];
  private _all: Category[] = [];
  private _collapsed = false;
  private _position: Position = { index: 0, count: 1 };

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
    this._children = sortCategories(value.filter((c) => c.parentId === this._category?.id));
    this.render();
  }

  set collapsed(value: boolean) {
    this._collapsed = value;
    this.render();
  }

  set position(value: Position) {
    this._position = value;
    this.render();
  }

  connectedCallback(): void {
    this.render();
  }

  private render(): void {
    if (!this._category) return;
    const root = this.shadowRoot!;
    const hasChildren = this._children.length > 0;
    const isRoot = this._category.parentId === null;
    const { index, count } = this._position;

    root.innerHTML = `
      <div class="node ${this._collapsed ? 'collapsed' : ''}">
        ${
          hasChildren
            ? `<button type="button" class="collapse-btn" aria-label="${this._collapsed ? 'Expand' : 'Collapse'}"><app-icon name="chevron"></app-icon></button>`
            : '<span class="collapse-spacer"></span>'
        }
        <span class="swatch" style="background:${this._category.color}"></span>
        <span class="name">${this._category.name}</span>
        <div class="actions">
          <button type="button" class="move-btn" data-direction="up" aria-label="Move up" ${index === 0 ? 'disabled' : ''}><app-icon name="arrow-up"></app-icon></button>
          <button type="button" class="move-btn" data-direction="down" aria-label="Move down" ${index === count - 1 ? 'disabled' : ''}><app-icon name="arrow-down"></app-icon></button>
          ${isRoot ? '<button type="button" class="add-btn" aria-label="Add subcategory"><app-icon name="plus"></app-icon></button>' : ''}
          <button type="button" class="edit-btn" aria-label="Edit"><app-icon name="edit"></app-icon></button>
          <button type="button" class="delete-btn" aria-label="Delete"><app-icon name="trash"></app-icon></button>
        </div>
      </div>
      <div class="children" style="${this._collapsed ? 'display:none' : ''}"></div>
    `;

    root.querySelector('.collapse-btn')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('toggle-collapse', {
          detail: { id: this._category.id },
          bubbles: true,
          composed: true,
        }),
      );
    });

    root.querySelectorAll<HTMLButtonElement>('.move-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('reorder', {
            detail: { id: this._category.id, direction: btn.dataset.direction as 'up' | 'down' },
            bubbles: true,
            composed: true,
          }),
        );
      });
    });

    root.querySelector('.add-btn')?.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('add-child', {
          detail: { parentId: this._category.id },
          bubbles: true,
          composed: true,
        }),
      );
    });

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
    this._children.forEach((child, i) => {
      const node = document.createElement('category-node') as CategoryNode;
      node.category = child;
      node.allCategories = this._all;
      node.position = { index: i, count: this._children.length };
      childrenEl.appendChild(node);
    });
  }
}

customElements.define('category-node', CategoryNode);
