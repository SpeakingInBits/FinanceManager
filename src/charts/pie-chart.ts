import * as d3 from 'd3';
import { ChartBase } from './chart-base';
import { formatCents } from '@/utils/currency';
import type { CategoryGroupSlice, CategorySubSlice } from './chart-utils';

interface SliceArc {
  data: CategorySubSlice;
  categoryName: string;
  startAngle: number;
  endAngle: number;
  /** Bisector of the whole category's arc — shared by all its subcategory slices so they explode together. */
  categoryMidAngle: number;
}

export class PieChart extends ChartBase {
  private _data: CategoryGroupSlice[] = [];

  set data(value: CategoryGroupSlice[]) {
    this._data = value;
    this.scheduleRender();
  }

  protected renderChart(width: number, height: number): void {
    const svg = d3.select(this.svg);
    svg.selectAll('*').remove();

    const total = d3.sum(this._data, (group) => group.total);

    if (total <= 0) {
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

    // "Exploded" view: nudge each *category* radially outward so the boundaries between
    // categories read clearly, while the subcategory slices within a category stay contiguous
    // (separated only by the stroke). Explode along the category's bisector so all its
    // subcategories move together as one wedge. Skip it for a single category — there's nothing
    // to separate from, and offsetting one ring just looks off-center.
    const baseRadius = Math.min(width, height) / 2 - 8;
    const multiCategory = this._data.length > 1;
    const explodeOffset = multiCategory ? Math.min(10, baseRadius * 0.06) : 0;
    const radius = baseRadius - explodeOffset;
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Manual angle layout: reserve a gap only between categories (not between subcategories),
    // then subdivide each category's arc among its subcategory slices with no gap.
    const categoryGap = multiCategory ? 0.03 : 0;
    const availableAngle = 2 * Math.PI - categoryGap * this._data.length;
    const arcs: SliceArc[] = [];
    let angle = 0;
    for (const group of this._data) {
      const categoryStart = angle;
      const categorySpan = (group.total / total) * availableAngle;
      const categoryMidAngle = categoryStart + categorySpan / 2;
      let sliceStart = categoryStart;
      for (const slice of group.slices) {
        const sliceSpan = group.total > 0 ? (slice.total / group.total) * categorySpan : 0;
        arcs.push({
          data: slice,
          categoryName: group.categoryName,
          startAngle: sliceStart,
          endAngle: sliceStart + sliceSpan,
          categoryMidAngle,
        });
        sliceStart += sliceSpan;
      }
      angle = categoryStart + categorySpan + categoryGap;
    }

    const arc = d3
      .arc<SliceArc>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius)
      .startAngle((d) => d.startAngle)
      .endAngle((d) => d.endAngle);

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
      .data(arcs)
      .join('path')
      .attr('d', arc)
      .attr('transform', (d) => {
        if (!multiCategory) return null;
        const x = Math.sin(d.categoryMidAngle) * explodeOffset;
        const y = -Math.cos(d.categoryMidAngle) * explodeOffset;
        return `translate(${x.toFixed(2)}, ${y.toFixed(2)})`;
      })
      .attr('fill', (d) => d.data.color)
      .attr('stroke', 'var(--color-surface)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('pointermove', (event: PointerEvent, d) => {
        const pct = total > 0 ? Math.round((d.data.total / total) * 100) : 0;
        const heading =
          d.categoryName === d.data.label ? d.data.label : `${d.categoryName} · ${d.data.label}`;
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
