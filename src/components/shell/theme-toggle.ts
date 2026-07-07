import css from './theme-toggle.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { setThemeModeAction } from '@/state/actions';
import type { ThemeMode } from '@/models/settings';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];
const ICON: Record<ThemeMode, string> = { system: 'auto', light: 'sun', dark: 'moon' };
const LABEL: Record<ThemeMode, string> = {
  system: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

export class ThemeToggle extends HTMLElement {
  private unsubscribe?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.unsubscribe = appStore.subscribe((state) => this.render(state.themeMode));
    this.render(appStore.getState().themeMode);
    this.shadowRoot!.addEventListener('click', () => {
      const current = appStore.getState().themeMode;
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
      void setThemeModeAction(next);
    });
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private render(mode: ThemeMode): void {
    this.shadowRoot!.innerHTML = `
      <button type="button" aria-label="${LABEL[mode]}" title="${LABEL[mode]}">
        <app-icon name="${ICON[mode]}"></app-icon>
      </button>
    `;
  }
}

customElements.define('theme-toggle', ThemeToggle);
