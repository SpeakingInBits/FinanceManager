import { describe, it, expect, beforeEach } from 'vitest';
import './sankey-chart';
import type { SankeyChart } from './sankey-chart';
import type { SankeyGraph } from './chart-utils';

function mount(): SankeyChart {
  document.body.innerHTML = '';
  const el = document.createElement('sankey-chart') as SankeyChart;
  document.body.appendChild(el);
  return el;
}

function graph(overrides: Partial<SankeyGraph> = {}): SankeyGraph {
  return {
    nodes: [
      { name: 'Salary', color: '#111' },
      { name: 'Vacation', color: '#2f6fed', isBudget: true },
      { name: 'Flights', color: '#222' },
    ],
    links: [
      { source: 0, target: 1, value: 100 },
      { source: 1, target: 2, value: 50 },
    ],
    ...overrides,
  };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('sankey-chart budget node indicator', () => {
  it('gives a budget node rounded corners and a dashed stroke that plain nodes do not have', async () => {
    const el = mount();
    el.data = graph();
    await nextFrame();
    const rects = [...el.shadowRoot!.querySelectorAll('rect')];
    const budgetRect = rects.find((r) => r.getAttribute('fill') === '#2f6fed')!;
    const plainRect = rects.find((r) => r.getAttribute('fill') === '#111')!;

    expect(budgetRect.getAttribute('rx')).toBe('4');
    expect(budgetRect.getAttribute('stroke-dasharray')).toBe('4,2');
    expect(budgetRect.getAttribute('stroke')).not.toBe('none');

    expect(plainRect.getAttribute('rx')).toBe('0');
    expect(plainRect.getAttribute('stroke')).toBe('none');
    expect(plainRect.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('suffixes the budget node label so it reads as a budget without hovering', async () => {
    const el = mount();
    el.data = graph();
    await nextFrame();
    const texts = [...el.shadowRoot!.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toContain('Vacation (budget)');
    expect(texts).toContain('Salary');
    expect(texts).not.toContain('Salary (budget)');
  });
});
