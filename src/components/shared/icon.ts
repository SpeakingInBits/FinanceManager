const ICONS: Record<string, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9h14v-9" />',
  list: '<path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.5" /><circle cx="3.5" cy="12" r="1.5" /><circle cx="3.5" cy="18" r="1.5" />',
  tag: '<path d="M20 12.5 12.5 20 4 11.5V4h7.5z" /><circle cx="8.5" cy="8.5" r="1.5" />',
  wallet:
    '<rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="16" cy="14" r="1.2" />',
  chart: '<path d="M4 20V10M12 20V4M20 20v-7" />',
  plus: '<path d="M12 5v14M5 12h14" />',
  edit: '<path d="M4 16.5V20h3.5L18 9.5 14.5 6z" />',
  trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />',
  close: '<path d="M6 6l12 12M18 6 6 18" />',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />',
  auto: '<circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />',
  chevron: '<path d="m9 6 6 6-6 6" />',
};

export class AppIcon extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['name'];
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private render(): void {
    const name = this.getAttribute('name') ?? '';
    const path = ICONS[name] ?? '';
    this.innerHTML = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }
}

customElements.define('app-icon', AppIcon);
