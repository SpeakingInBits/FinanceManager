import { appStore } from '@/state/app-store';
import { AppEvents, type BudgetDeleteDetail } from '@/state/events';
import type { ModalDialog } from '@/components/shared/modal-dialog';
import type { BudgetForm } from '@/components/budgets/budget-form';
import type { Budget } from '@/models/budget';

export class BudgetsView extends HTMLElement {
  connectedCallback(): void {
    this.className = 'view';
    this.innerHTML = `
      <div class="view-header">
        <h1>Budgets</h1>
        <button type="button" class="btn add-btn"><app-icon name="plus"></app-icon> Add</button>
      </div>
      <budget-list></budget-list>
      <modal-dialog heading="Add budget" class="budget-modal">
        <budget-form></budget-form>
      </modal-dialog>
    `;

    this.querySelector('.add-btn')!.addEventListener('click', () => this.openForm(null));

    this.addEventListener('edit', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      const budget = appStore.getState().budgets.find((b) => b.id === id) ?? null;
      this.openForm(budget);
    });

    this.addEventListener('delete', (e) => {
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      if (confirm('Delete this budget?')) {
        this.dispatchEvent(
          new CustomEvent<BudgetDeleteDetail>(AppEvents.BudgetDelete, {
            detail: { id },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });

    this.addEventListener('form-done', () => this.closeModal());
    this.addEventListener('form-cancel', () => this.closeModal());
  }

  private openForm(budget: Budget | null): void {
    const form = this.querySelector('budget-form') as BudgetForm;
    form.budget = budget;
    const modal = this.querySelector('.budget-modal') as ModalDialog;
    modal.setAttribute('heading', budget ? 'Edit budget' : 'Add budget');
    modal.open();
  }

  private closeModal(): void {
    (this.querySelector('.budget-modal') as ModalDialog)?.close();
  }
}

customElements.define('budgets-view', BudgetsView);
