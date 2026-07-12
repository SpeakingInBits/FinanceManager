import { describe, it, expect, beforeEach } from 'vitest';
import '@/components/shared/amount-input';
import './budget-form';
import { appStore } from '@/state/app-store';
import { AppEvents, type BudgetSubmitDetail } from '@/state/events';
import type { BudgetForm } from './budget-form';
import type { Budget } from '@/models/budget';
import type { Category } from '@/models/category';

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    name: 'Groceries',
    description: '',
    targetAmount: 10000,
    periodType: 'monthly',
    startDate: new Date(2026, 5, 1).getTime(),
    endDate: null,
    categoryId: null,
    subcategoryId: null,
    createdAt: 0,
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 'c1', name: 'Food', parentId: null, color: '#000', createdAt: 0, ...overrides };
}

function mount(): BudgetForm {
  document.body.innerHTML = '';
  const el = document.createElement('budget-form') as BudgetForm;
  document.body.appendChild(el);
  return el;
}

function submit(form: BudgetForm): BudgetSubmitDetail {
  let detail!: BudgetSubmitDetail;
  form.addEventListener(
    AppEvents.BudgetSubmit,
    (e) => {
      detail = (e as CustomEvent<BudgetSubmitDetail>).detail;
    },
    { once: true },
  );
  form.shadowRoot!.querySelector('form')!.requestSubmit();
  return detail;
}

beforeEach(() => {
  appStore.setState({ categories: [] });
  document.body.innerHTML = '';
});

describe('budget-form', () => {
  it('hides the subcategory field when no top-level category is selected', () => {
    appStore.setState({
      categories: [makeCategory({ id: 'travel', name: 'Travel' }), makeCategory({ id: 'flights', name: 'Flights', parentId: 'travel' })],
    });
    const form = mount();
    form.budget = null;
    expect(form.shadowRoot!.querySelector('#subcategory')).toBeNull();
  });

  it('shows only the selected category\'s children as subcategory options', () => {
    appStore.setState({
      categories: [
        makeCategory({ id: 'travel', name: 'Travel' }),
        makeCategory({ id: 'flights', name: 'Flights', parentId: 'travel' }),
        makeCategory({ id: 'food', name: 'Food' }),
      ],
    });
    const form = mount();
    form.budget = null;
    const categorySelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#category')!;
    categorySelect.value = 'travel';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    const options = [...form.shadowRoot!.querySelectorAll<HTMLOptionElement>('#subcategory option')].map(
      (o) => o.textContent,
    );
    expect(options).toEqual(['None', 'Flights']);
  });

  it('resets the chosen subcategory when the parent category changes', () => {
    appStore.setState({
      categories: [
        makeCategory({ id: 'travel', name: 'Travel' }),
        makeCategory({ id: 'flights', name: 'Flights', parentId: 'travel' }),
        makeCategory({ id: 'food', name: 'Food' }),
        makeCategory({ id: 'groceries', name: 'Groceries', parentId: 'food' }),
      ],
    });
    const form = mount();
    form.budget = makeBudget({ categoryId: 'travel', subcategoryId: 'flights' });
    const categorySelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#category')!;
    categorySelect.value = 'food';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    const detail = submit(form);
    expect(detail.input.categoryId).toBe('food');
    expect(detail.input.subcategoryId).toBeNull();
  });

  it('submits the selected category and subcategory', () => {
    appStore.setState({
      categories: [
        makeCategory({ id: 'travel', name: 'Travel' }),
        makeCategory({ id: 'flights', name: 'Flights', parentId: 'travel' }),
      ],
    });
    const form = mount();
    form.budget = null;
    const nameEl = form.shadowRoot!.querySelector<HTMLInputElement>('#name')!;
    nameEl.value = 'Trip fund';
    nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    const categorySelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#category')!;
    categorySelect.value = 'travel';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    const subcategorySelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#subcategory')!;
    subcategorySelect.value = 'flights';
    subcategorySelect.dispatchEvent(new Event('change', { bubbles: true }));
    const detail = submit(form);
    expect(detail.input.categoryId).toBe('travel');
    expect(detail.input.subcategoryId).toBe('flights');
  });

  it('regression: preserves the entered name and amount when the category selection changes', () => {
    appStore.setState({
      categories: [
        makeCategory({ id: 'travel', name: 'Travel' }),
        makeCategory({ id: 'flights', name: 'Flights', parentId: 'travel' }),
      ],
    });
    const form = mount();
    form.budget = null;
    const nameEl = form.shadowRoot!.querySelector<HTMLInputElement>('#name')!;
    nameEl.value = 'Trip fund';
    nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    const amountEl = form.shadowRoot!.querySelector<HTMLElement & { valueCents: number }>('#amount')!;
    amountEl.valueCents = 50000;
    amountEl.dispatchEvent(new Event('input', { bubbles: true }));

    const categorySelect = form.shadowRoot!.querySelector<HTMLSelectElement>('#category')!;
    categorySelect.value = 'travel';
    categorySelect.dispatchEvent(new Event('change', { bubbles: true }));

    expect(form.shadowRoot!.querySelector<HTMLInputElement>('#name')!.value).toBe('Trip fund');
    expect(
      form.shadowRoot!.querySelector<HTMLElement & { valueCents: number }>('#amount')!.valueCents,
    ).toBe(50000);
  });

  it('populates category and subcategory when editing an existing budget', () => {
    appStore.setState({
      categories: [
        makeCategory({ id: 'travel', name: 'Travel' }),
        makeCategory({ id: 'flights', name: 'Flights', parentId: 'travel' }),
      ],
    });
    const form = mount();
    form.budget = makeBudget({ categoryId: 'travel', subcategoryId: 'flights' });
    expect(form.shadowRoot!.querySelector<HTMLSelectElement>('#category')!.value).toBe('travel');
    expect(form.shadowRoot!.querySelector<HTMLSelectElement>('#subcategory')!.value).toBe('flights');
  });

  it('submits null categoryId/subcategoryId for a general budget', () => {
    const form = mount();
    form.budget = null;
    const nameEl = form.shadowRoot!.querySelector<HTMLInputElement>('#name')!;
    nameEl.value = 'Rainy day';
    nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    const detail = submit(form);
    expect(detail.input.categoryId).toBeNull();
    expect(detail.input.subcategoryId).toBeNull();
  });

  it('submits the entered description as notes', () => {
    const form = mount();
    form.budget = null;
    const nameEl = form.shadowRoot!.querySelector<HTMLInputElement>('#name')!;
    nameEl.value = 'Rainy day';
    nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    const descriptionEl = form.shadowRoot!.querySelector<HTMLTextAreaElement>('#description')!;
    descriptionEl.value = '  Emergency savings for the roof  ';
    descriptionEl.dispatchEvent(new Event('input', { bubbles: true }));
    const detail = submit(form);
    expect(detail.input.description).toBe('Emergency savings for the roof');
  });

  it('populates the description when editing an existing budget', () => {
    const form = mount();
    form.budget = makeBudget({ description: 'Set aside for the annual trip' });
    expect(form.shadowRoot!.querySelector<HTMLTextAreaElement>('#description')!.value).toBe(
      'Set aside for the annual trip',
    );
  });

  it('leaves the end date optional for a one-time budget', () => {
    const form = mount();
    form.budget = null;
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-period="one-time"]')!.click();
    const endEl = form.shadowRoot!.querySelector<HTMLInputElement>('#end')!;
    expect(endEl.required).toBe(false);
  });

  it('submits a one-time budget with a null end date when none is entered', () => {
    const form = mount();
    form.budget = null;
    form.shadowRoot!.querySelector<HTMLButtonElement>('[data-period="one-time"]')!.click();
    const nameEl = form.shadowRoot!.querySelector<HTMLInputElement>('#name')!;
    nameEl.value = 'Emergency Fund';
    nameEl.dispatchEvent(new Event('input', { bubbles: true }));
    const detail = submit(form);
    expect(detail.input.periodType).toBe('one-time');
    expect(detail.input.endDate).toBeNull();
  });
});
