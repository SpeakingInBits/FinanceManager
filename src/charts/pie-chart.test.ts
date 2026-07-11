import { describe, it, expect, beforeEach } from 'vitest';
import './pie-chart';
import type { PieChart } from './pie-chart';
import type { CategoryGroupSlice, CategorySubSlice } from './chart-utils';

function mount(): PieChart {
  document.body.innerHTML = '';
  const el = document.createElement('pie-chart') as PieChart;
  document.body.appendChild(el);
  return el;
}

function subSlice(overrides: Partial<CategorySubSlice> = {}): CategorySubSlice {
  return {
    key: 'food:none',
    categoryId: 'food',
    subcategoryId: null,
    label: 'Food',
    total: 1000,
    color: '#ff0000',
    ...overrides,
  };
}

function group(overrides: Partial<CategoryGroupSlice> = {}): CategoryGroupSlice {
  const base: CategoryGroupSlice = {
    categoryId: 'food',
    categoryName: 'Food',
    color: '#ff0000',
    total: 1000,
    slices: [subSlice()],
  };
  return { ...base, ...overrides };
}

/** Chart rendering is scheduled via requestAnimationFrame; flush one to let it run. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('pie-chart legend', () => {
  it('renders no legend groups when there is no data', async () => {
    const el = mount();
    el.data = [];
    await nextFrame();
    expect(el.shadowRoot!.querySelector('.legend')!.children.length).toBe(0);
  });

  it('renders one legend group per category, with no children when it has a single slice', async () => {
    const el = mount();
    el.data = [
      group({ categoryName: 'Food', color: '#ff0000', slices: [subSlice({ label: 'Food', total: 750 })] }),
      group({
        categoryId: 'rent',
        categoryName: 'Rent',
        color: '#00ff00',
        total: 250,
        slices: [subSlice({ key: 'rent:none', categoryId: 'rent', label: 'Rent', total: 250 })],
      }),
    ];
    await nextFrame();
    const groups = el.shadowRoot!.querySelectorAll('.legend-group');
    expect(groups).toHaveLength(2);
    expect(groups[0]!.querySelector('.legend-header')!.textContent).toContain('Food');
    expect(groups[0]!.querySelector('.legend-children')).toBeNull();
    expect(groups[1]!.querySelector('.legend-header')!.textContent).toContain('Rent');
  });

  it('nests subcategory slices under the category header when a category has more than one', async () => {
    const el = mount();
    el.data = [
      group({
        categoryName: 'Travel',
        color: '#2f6fed',
        total: 1000,
        slices: [
          subSlice({ key: 'travel:flights', label: 'Flights', total: 600, color: '#2f6fed' }),
          subSlice({ key: 'travel:hotels', label: 'Hotels', total: 400, color: '#5a8ff2' }),
        ],
      }),
    ];
    await nextFrame();
    const header = el.shadowRoot!.querySelector('.legend-header')!;
    expect(header.textContent).toContain('Travel');
    const children = el.shadowRoot!.querySelectorAll('.legend-children .legend-item');
    expect(children).toHaveLength(2);
    expect(children[0]!.textContent).toContain('Flights');
    expect(children[1]!.textContent).toContain('Hotels');
  });

  it('labels a direct (no-subcategory) bucket as Other when siblings have real subcategories', async () => {
    const el = mount();
    el.data = [
      group({
        categoryName: 'Travel',
        slices: [
          subSlice({ key: 'travel:flights', subcategoryId: 'flights', label: 'Flights', total: 600 }),
          subSlice({ key: 'travel:none', subcategoryId: null, label: 'Other', total: 400 }),
        ],
      }),
    ];
    await nextFrame();
    const children = [...el.shadowRoot!.querySelectorAll('.legend-children .legend-item')].map(
      (c) => c.textContent,
    );
    expect(children.some((t) => t!.includes('Other'))).toBe(true);
  });

  it('includes the amount and percent share in the group and child labels', async () => {
    const el = mount();
    el.data = [
      group({
        categoryName: 'Travel',
        total: 1000,
        slices: [
          subSlice({ key: 'travel:flights', label: 'Flights', total: 750 }),
          subSlice({ key: 'travel:hotels', label: 'Hotels', total: 250 }),
        ],
      }),
    ];
    await nextFrame();
    const header = el.shadowRoot!.querySelector('.legend-header')!;
    expect(header.textContent).toContain('$10.00');
    expect(header.textContent).toContain('100%');
    const children = el.shadowRoot!.querySelectorAll('.legend-children .legend-item');
    expect(children[0]!.textContent).toContain('$7.50');
    expect(children[0]!.textContent).toContain('75%');
    expect(children[1]!.textContent).toContain('25%');
  });

  it('renders one pie slice (path) per subcategory across all groups', async () => {
    const el = mount();
    el.data = [
      group({
        categoryName: 'Travel',
        slices: [subSlice({ key: 'travel:a', label: 'A', total: 100 }), subSlice({ key: 'travel:b', label: 'B', total: 200 })],
      }),
      group({ categoryId: 'food', categoryName: 'Food', slices: [subSlice({ key: 'food:none', label: 'Food', total: 300 })] }),
    ];
    await nextFrame();
    expect(el.shadowRoot!.querySelectorAll('path')).toHaveLength(3);
  });

  it('clears the legend when data is reset to empty', async () => {
    const el = mount();
    el.data = [group()];
    await nextFrame();
    expect(el.shadowRoot!.querySelectorAll('.legend-group')).toHaveLength(1);
    el.data = [];
    await nextFrame();
    expect(el.shadowRoot!.querySelectorAll('.legend-group')).toHaveLength(0);
  });
});

describe('pie-chart exploded slices', () => {
  it('offsets every slice outward with a translate transform when there is more than one', async () => {
    const el = mount();
    el.data = [
      group({
        categoryName: 'Split',
        slices: [
          subSlice({ key: 'a', label: 'A', total: 100 }),
          subSlice({ key: 'b', label: 'B', total: 100 }),
        ],
      }),
    ];
    await nextFrame();
    const paths = [...el.shadowRoot!.querySelectorAll('path')];
    expect(paths).toHaveLength(2);
    for (const p of paths) {
      expect(p.getAttribute('transform')).toMatch(/^translate\(/);
    }
  });

  it('offsets slices in different directions so opposing slices do not share a transform', async () => {
    const el = mount();
    el.data = [
      group({
        categoryName: 'Split',
        slices: [
          subSlice({ key: 'a', label: 'A', total: 100 }),
          subSlice({ key: 'b', label: 'B', total: 100 }),
        ],
      }),
    ];
    await nextFrame();
    const transforms = [...el.shadowRoot!.querySelectorAll('path')].map((p) =>
      p.getAttribute('transform'),
    );
    expect(transforms[0]).not.toBe(transforms[1]);
  });

  it('does not offset a single full-ring slice', async () => {
    const el = mount();
    el.data = [group({ slices: [subSlice({ key: 'only', label: 'Only', total: 100 })] })];
    await nextFrame();
    const path = el.shadowRoot!.querySelector('path')!;
    expect(path.getAttribute('transform')).toBeNull();
  });
});
