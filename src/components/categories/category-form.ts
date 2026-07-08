import css from './category-form.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { AppEvents, type CategorySubmitDetail } from '@/state/events';
import type { Category } from '@/models/category';

const DEFAULT_COLOR = '#2f6fed';

export class CategoryForm extends HTMLElement {
  private unsubscribe?: () => void;
  private editing: Category | null = null;
  private _presetParentId: string | null = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  set category(value: Category | null) {
    this.editing = value;
    this._presetParentId = null;
    this.render();
  }

  /** Pre-selects a parent for a fresh "add subcategory" flow; ignored once editing is set. */
  set presetParentId(id: string | null) {
    this._presetParentId = id;
    this.render();
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe(() => this.render());
    this.render();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private render(): void {
    const root = this.shadowRoot!;
    const c = this.editing;
    const parentOptions = appStore
      .getState()
      .categories.filter((cat) => cat.id !== c?.id && cat.parentId === null);

    root.innerHTML = `
      <form>
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" value="${c?.name ?? ''}" required />
        </div>

        <div class="field">
          <label for="parent">Parent category</label>
          <select id="parent">
            <option value="">None (top-level)</option>
            ${parentOptions
              .map(
                (p) =>
                  `<option value="${p.id}" ${p.id === (c?.parentId ?? this._presetParentId) ? 'selected' : ''}>${p.name}</option>`,
              )
              .join('')}
          </select>
        </div>

        <div class="field color-field">
          <label for="color">Color</label>
          <input type="color" id="color" value="${c?.color ?? DEFAULT_COLOR}" />
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
          <button type="submit" class="btn">${c ? 'Save' : 'Add'}</button>
        </div>
      </form>
    `;

    root.querySelector('.cancel-btn')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('form-cancel', { bubbles: true, composed: true }));
    });

    root.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = root.querySelector<HTMLInputElement>('#name')!;
      const parentEl = root.querySelector<HTMLSelectElement>('#parent')!;
      const colorEl = root.querySelector<HTMLInputElement>('#color')!;

      this.dispatchEvent(
        new CustomEvent<CategorySubmitDetail>(AppEvents.CategorySubmit, {
          detail: {
            id: c?.id,
            input: {
              name: nameEl.value.trim(),
              parentId: parentEl.value || null,
              color: colorEl.value,
            },
          },
          bubbles: true,
          composed: true,
        }),
      );
      this.dispatchEvent(new CustomEvent('form-done', { bubbles: true, composed: true }));
    });
  }
}

customElements.define('category-form', CategoryForm);
