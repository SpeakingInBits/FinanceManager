import { appStore } from '@/state/app-store';
import { routes } from '@/router/routes';
import {
  AppEvents,
  type BudgetDeleteDetail,
  type BudgetSubmitDetail,
  type CategoryDeleteDetail,
  type CategorySubmitDetail,
  type RecurringTransactionDeleteDetail,
  type RecurringTransactionStopDetail,
  type RecurringTransactionSubmitDetail,
  type TransactionDeleteDetail,
  type TransactionSubmitDetail,
} from '@/state/events';
import {
  addBudgetAction,
  addCategoryAction,
  addRecurringTransactionAction,
  addTransactionAction,
  deleteBudgetAction,
  deleteCategoryAction,
  deleteRecurringTransactionAction,
  deleteTransactionAction,
  stopRecurringTransactionAction,
  updateBudgetAction,
  updateCategoryAction,
  updateRecurringTransactionAction,
  updateTransactionAction,
} from '@/state/actions';

export class AppShell extends HTMLElement {
  private unsubscribe?: () => void;
  private currentTag = '';

  connectedCallback(): void {
    this.innerHTML = `
      <bottom-nav></bottom-nav>
      <main class="app-main">
        <header class="view-header">
          <h1>Finance Tracker</h1>
          <theme-toggle></theme-toggle>
        </header>
        <div class="outlet"></div>
      </main>
    `;

    this.unsubscribe = appStore.subscribe((state) => this.renderOutlet(state.route));
    this.renderOutlet(appStore.getState().route);

    this.addEventListener(AppEvents.TransactionSubmit, (e) => {
      const { id, input } = (e as CustomEvent<TransactionSubmitDetail>).detail;
      void (id ? updateTransactionAction(id, input) : addTransactionAction(input));
    });
    this.addEventListener(AppEvents.TransactionDelete, (e) => {
      const { id } = (e as CustomEvent<TransactionDeleteDetail>).detail;
      void deleteTransactionAction(id);
    });
    this.addEventListener(AppEvents.CategorySubmit, (e) => {
      const { id, input } = (e as CustomEvent<CategorySubmitDetail>).detail;
      void (id ? updateCategoryAction(id, input) : addCategoryAction(input));
    });
    this.addEventListener(AppEvents.CategoryDelete, (e) => {
      const { id } = (e as CustomEvent<CategoryDeleteDetail>).detail;
      void deleteCategoryAction(id);
    });
    this.addEventListener(AppEvents.BudgetSubmit, (e) => {
      const { id, input } = (e as CustomEvent<BudgetSubmitDetail>).detail;
      void (id ? updateBudgetAction(id, input) : addBudgetAction(input));
    });
    this.addEventListener(AppEvents.BudgetDelete, (e) => {
      const { id } = (e as CustomEvent<BudgetDeleteDetail>).detail;
      void deleteBudgetAction(id);
    });
    this.addEventListener(AppEvents.RecurringTransactionSubmit, (e) => {
      const { id, input } = (e as CustomEvent<RecurringTransactionSubmitDetail>).detail;
      void (id ? updateRecurringTransactionAction(id, input) : addRecurringTransactionAction(input));
    });
    this.addEventListener(AppEvents.RecurringTransactionStop, (e) => {
      const { id } = (e as CustomEvent<RecurringTransactionStopDetail>).detail;
      void stopRecurringTransactionAction(id);
    });
    this.addEventListener(AppEvents.RecurringTransactionDelete, (e) => {
      const { id } = (e as CustomEvent<RecurringTransactionDeleteDetail>).detail;
      void deleteRecurringTransactionAction(id);
    });
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
  }

  private renderOutlet(route: string): void {
    const def = routes.find((r) => r.path === route) ?? routes[0]!;
    if (def.tag === this.currentTag) return;
    this.currentTag = def.tag;
    const outlet = this.querySelector('.outlet')!;
    outlet.innerHTML = '';
    outlet.appendChild(document.createElement(def.tag));
  }
}

customElements.define('app-shell', AppShell);
