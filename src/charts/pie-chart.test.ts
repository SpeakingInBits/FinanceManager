import { describe, it, expect, beforeEach } from 'vitest';
import './pie-chart';
import type { PieChart } from './pie-chart';
import type { CategorySlice } from './chart-utils';

function mount(): PieChart {
  document.body.innerHTML = '';
  const el = document.createElement('pie-chart') as PieChart;
  document.body.appendChild(el);
  return el;
}

function slice(overrides: Partial<CategorySlice> = {}): CategorySlice {
  return { categoryId: 'c1', categoryName: 'Food', total: 1000, color: '#ff0000', ...overrides };
}

/** Chart rendering is scheduled via requestAnimationFrame; flush one to let it run. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pie-chart legend', () => {
  it('renders no legend items when there is no data', async () => {
    const el = mount();
    el.data = [];
    await nextFrame();
    expect(el.shadowRoot!.querySelector('.legend')!.children.length).toBe(0);
  });

  it('renders one legend item per slice with its color and name', async () => {
    const el = mount();
    el.data = [
      slice({ categoryName: 'Food', color: '#ff0000' }),
      slice({ categoryName: 'Rent', color: '#00ff00' }),
    ];
    await nextFrame();
    const items = el.shadowRoot!.querySelectorAll('.legend-item');
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain('Food');
    expect(items[1]!.textContent).toContain('Rent');
    expect((items[0]!.querySelector('.legend-swatch') as HTMLElement).style.background).toBe(
      'rgb(255, 0, 0)',
    );
  });

  it('includes the amount and percent share in the legend label', async () => {
    const el = mount();
    el.data = [slice({ categoryName: 'Food', total: 750 }), slice({ categoryName: 'Rent', total: 250 })];
    await nextFrame();
    const items = el.shadowRoot!.querySelectorAll('.legend-item');
    expect(items[0]!.textContent).toContain('$7.50');
    expect(items[0]!.textContent).toContain('75%');
    expect(items[1]!.textContent).toContain('25%');
  });

  it('clears the legend when data is reset to empty', async () => {
    const el = mount();
    el.data = [slice()];
    await nextFrame();
    expect(el.shadowRoot!.querySelectorAll('.legend-item')).toHaveLength(1);
    el.data = [];
    await nextFrame();
    expect(el.shadowRoot!.querySelectorAll('.legend-item')).toHaveLength(0);
  });
});
