import * as d3 from 'd3';
import { ChartBase } from './chart-base';
import { formatCents } from '@/utils/currency';
import type { CategorySlice } from './chart-utils';

export class PieChart extends ChartBase {
  private _data: CategorySlice[] = [];

  set data(value: CategorySlice[]) {
    this._data = value;
    this.scheduleRender();
  }

  protected renderChart(width: number, height: number): void {
    const svg = d3.select(this.svg);
    svg.selectAll('*').remove();

    if (this._data.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .text('No data yet');
      return;
    }

    const radius = Math.min(width, height) / 2 - 8;
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3
      .pie<CategorySlice>()
      .value((d) => d.total)
      .sort(null);
    const arc = d3
      .arc<d3.PieArcDatum<CategorySlice>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius);

    const total = d3.sum(this._data, (d) => d.total);

    g.selectAll('path')
      .data(pie(this._data))
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', 'var(--color-surface)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('pointermove', (event: PointerEvent, d) => {
        const pct = total > 0 ? Math.round((d.data.total / total) * 100) : 0;
        this.showTooltip(
          event.clientX,
          event.clientY,
          `<strong>${d.data.categoryName}</strong><br>${formatCents(d.data.total)} (${pct}%)`,
        );
      })
      .on('pointerleave', () => this.hideTooltip());
  }
}

customElements.define('pie-chart', PieChart);
