import css from './empty-state.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';

export class EmptyState extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['message', 'icon'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private render(): void {
    const message = this.getAttribute('message') ?? 'Nothing here yet';
    const icon = this.getAttribute('icon') ?? 'list';
    this.shadowRoot!.innerHTML = `
      <app-icon name="${icon}"></app-icon>
      <p>${message}</p>
    `;
  }
}

customElements.define('empty-state', EmptyState);
