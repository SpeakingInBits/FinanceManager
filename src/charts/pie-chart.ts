import * as d3 from 'd3';
import { ChartBase } from './chart-base';
import { formatCents } from '@/utils/currency';
import type { CategoryGroupSlice, CategorySubSlice } from './chart-utils';

export class PieChart extends ChartBase {
  private _data: CategoryGroupSlice[] = [];

  set data(value: CategoryGroupSlice[]) {
    this._data = value;
    this.scheduleRender();
  }

  protected renderChart(width: number, height: number): void {
    const svg = d3.select(this.svg);
    svg.selectAll('*').remove();

    const slices = this._data.flatMap((group) => group.slices);

    if (slices.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .text('No data yet');
      this.setGroupedLegend([]);
      return;
    }

    // "Exploded" view: nudge each slice radially outward from the center so the boundaries
    // between slices read clearly. Shrink the radius by the offset so the pushed-out slices
    // still fit within the SVG bounds. Skip it for a single slice — there's nothing to separate
    // from, and offsetting one full ring just looks off-center.
    const baseRadius = Math.min(width, height) / 2 - 8;
    const explode = slices.length > 1;
    const explodeOffset = explode ? Math.min(10, baseRadius * 0.06) : 0;
    const radius = baseRadius - explodeOffset;
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    const pie = d3
      .pie<CategorySubSlice>()
      .value((d) => d.total)
      .sort(null)
      .padAngle(0.02);
    const arc = d3
      .arc<d3.PieArcDatum<CategorySubSlice>>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius);

    const total = d3.sum(slices, (d) => d.total);
    const categoryNameBySlice = new Map(
      this._data.flatMap((group) => group.slices.map((s) => [s.key, group.categoryName])),
    );

    this.setGroupedLegend(
      this._data.map((group) => {
        const pct = total > 0 ? Math.round((group.total / total) * 100) : 0;
        return {
          label: `${group.categoryName} — ${formatCents(group.total)} (${pct}%)`,
          color: group.color,
          children:
            group.slices.length > 1
              ? group.slices.map((s) => {
                  const spct = total > 0 ? Math.round((s.total / total) * 100) : 0;
                  return { label: `${s.label} — ${formatCents(s.total)} (${spct}%)`, color: s.color };
                })
              : undefined,
        };
      }),
    );

    g.selectAll('path')
      .data(pie(slices))
      .join('path')
      .attr('d', arc)
      .attr('transform', (d) => {
        if (!explode) return null;
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const x = Math.sin(midAngle) * explodeOffset;
        const y = -Math.cos(midAngle) * explodeOffset;
        return `translate(${x.toFixed(2)}, ${y.toFixed(2)})`;
      })
      .attr('fill', (d) => d.data.color)
      .attr('stroke', 'var(--color-surface)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('pointermove', (event: PointerEvent, d) => {
        const pct = total > 0 ? Math.round((d.data.total / total) * 100) : 0;
        const categoryName = categoryNameBySlice.get(d.data.key) ?? d.data.label;
        const heading =
          categoryName === d.data.label ? d.data.label : `${categoryName} · ${d.data.label}`;
        this.showTooltip(
          event.clientX,
          event.clientY,
          `<strong>${heading}</strong><br>${formatCents(d.data.total)} (${pct}%)`,
        );
      })
      .on('pointerleave', () => this.hideTooltip());
  }
}

customElements.define('pie-chart', PieChart);
