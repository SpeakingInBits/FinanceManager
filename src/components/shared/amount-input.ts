import css from './amount-input.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { parseToCents } from '@/utils/currency';

/** Currency-formatted numeric input. Exposes/accepts value as integer cents. */
export class AmountInput extends HTMLElement {
  static formAssociated = true;

  private internals: ElementInternals;
  private inputEl!: HTMLInputElement;

  constructor() {
    super();
    this.internals = this.attachInternals();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
  }

  connectedCallback(): void {
    this.shadowRoot!.innerHTML = `
      <div class="wrap">
        <span class="prefix">$</span>
        <input type="text" inputmode="decimal" placeholder="0.00" />
      </div>
    `;
    this.inputEl = this.shadowRoot!.querySelector('input')!;
    if (this.hasAttribute('value')) {
      this.valueCents = Number(this.getAttribute('value'));
    }
    this.inputEl.addEventListener('input', () => {
      this.internals.setFormValue(String(this.valueCents));
      this.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  get valueCents(): number {
    return parseToCents(this.inputEl?.value ?? '0');
  }

  set valueCents(cents: number) {
    if (this.inputEl) {
      this.inputEl.value = (cents / 100).toFixed(2);
      this.internals.setFormValue(String(cents));
    }
  }
}

customElements.define('amount-input', AmountInput);
