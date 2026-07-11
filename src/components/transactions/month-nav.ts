import css from './month-nav.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';
import { appStore } from '@/state/app-store';
import { setSelectedMonthAction } from '@/state/actions';
import { formatMonthYear, shiftMonth, startOfMonth } from '@/utils/date';

/** Prev/next control for browsing the transactions and dashboard by month. */
export class MonthNav extends HTMLElement {
  private unsubscribe?: () => void;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
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
    const { selectedMonth } = appStore.getState();
    const isCurrentMonth = selectedMonth >= startOfMonth(Date.now());

    root.innerHTML = `
      <div class="nav">
        <button type="button" class="prev btn-icon" aria-label="Previous month">
          <app-icon name="chevron"></app-icon>
        </button>
        <span class="label">${formatMonthYear(selectedMonth)}</span>
        <button type="button" class="next btn-icon" aria-label="Next month" ${isCurrentMonth ? 'disabled' : ''}>
          <app-icon name="chevron"></app-icon>
        </button>
      </div>
    `;

    root.querySelector('.prev')!.addEventListener('click', () => {
      setSelectedMonthAction(shiftMonth(selectedMonth, -1));
    });
    root.querySelector('.next')!.addEventListener('click', () => {
      if (isCurrentMonth) return;
      setSelectedMonthAction(shiftMonth(selectedMonth, 1));
    });
  }
}

customElements.define('month-nav', MonthNav);
