import { describe, it, expect, beforeEach } from 'vitest';
import './month-nav';
import { appStore } from '@/state/app-store';
import { setSelectedMonthAction } from '@/state/actions';
import { startOfMonth, shiftMonth, formatMonthYear } from '@/utils/date';

function mount(): HTMLElement {
  document.body.innerHTML = '';
  const el = document.createElement('month-nav');
  document.body.appendChild(el);
  return el;
}

const currentMonth = startOfMonth(Date.now());

describe('month-nav', () => {
  beforeEach(() => {
    setSelectedMonthAction(currentMonth);
  });

  it('renders the label for the currently selected month', () => {
    const past = shiftMonth(currentMonth, -2);
    setSelectedMonthAction(past);
    const el = mount();
    const label = el.shadowRoot!.querySelector('.label')!.textContent;
    expect(label).toBe(formatMonthYear(past));
  });

  it('disables the next button when viewing the current month', () => {
    const el = mount();
    const next = el.shadowRoot!.querySelector('.next') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it('enables the next button when viewing a past month', () => {
    setSelectedMonthAction(shiftMonth(currentMonth, -1));
    const el = mount();
    const next = el.shadowRoot!.querySelector('.next') as HTMLButtonElement;
    expect(next.disabled).toBe(false);
  });

  it('moves the selected month back one month when prev is clicked', () => {
    const el = mount();
    (el.shadowRoot!.querySelector('.prev') as HTMLButtonElement).click();
    expect(appStore.getState().selectedMonth).toBe(shiftMonth(currentMonth, -1));
  });

  it('moves the selected month forward one month when next is clicked from a past month', () => {
    setSelectedMonthAction(shiftMonth(currentMonth, -1));
    const el = mount();
    (el.shadowRoot!.querySelector('.next') as HTMLButtonElement).click();
    expect(appStore.getState().selectedMonth).toBe(currentMonth);
  });

  it('does not advance past the current month when next is disabled', () => {
    const el = mount();
    (el.shadowRoot!.querySelector('.next') as HTMLButtonElement).click();
    expect(appStore.getState().selectedMonth).toBe(currentMonth);
  });

  it('re-renders the label after navigating', () => {
    const el = mount();
    (el.shadowRoot!.querySelector('.prev') as HTMLButtonElement).click();
    const label = el.shadowRoot!.querySelector('.label')!.textContent;
    expect(label).toBe(formatMonthYear(shiftMonth(currentMonth, -1)));
  });
});
