import css from './bottom-nav.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { routes } from '@/router/routes';

export class BottomNav extends HTMLElement {
  private unsubscribe?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe((state) => this.render(state.route));
    this.render(appStore.getState().route);
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private render(activeRoute: string): void {
    const root = this.shadowRoot!;
    root.innerHTML = `
      <nav aria-label="Primary">
        ${routes
          .map(
            (r) => `
          <a class="tab" href="#${r.path}" aria-current="${r.path === activeRoute ? 'page' : 'false'}">
            <app-icon name="${r.icon}"></app-icon>
            <span>${r.label}</span>
          </a>`,
          )
          .join('')}
      </nav>
    `;
  }
}

customElements.define('bottom-nav', BottomNav);
