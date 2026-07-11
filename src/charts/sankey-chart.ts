import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, type SankeyNode } from 'd3-sankey';
import { ChartBase } from './chart-base';
import { formatCents } from '@/utils/currency';
import type { SankeyGraph, SankeyNodeDatum } from './chart-utils';

interface InputLink {
  source: number;
  target: number;
  value: number;
}

type LaidOutNode = SankeyNode<SankeyNodeDatum, InputLink>;

export class SankeyChart extends ChartBase {
  private _data: SankeyGraph = { nodes: [], links: [] };

  set data(value: SankeyGraph) {
    this._data = value;
    this.scheduleRender();
  }

  protected renderChart(width: number, height: number): void {
    const svg = d3.select(this.svg);
    svg.selectAll('*').remove();

    if (this._data.links.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-text-muted)')
        .text('No data yet');
      return;
    }

    const layout = sankey<SankeyNodeDatum, InputLink>()
      .nodeWidth(14)
      .nodePadding(12)
      .extent([
        [4, 4],
        [width - 4, height - 4],
      ]);

    const graph = layout({
      nodes: this._data.nodes.map((n) => ({ ...n })),
      links: this._data.links.map((l) => ({ ...l })),
    });

    svg
      .append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', (d) => (d.source as LaidOutNode).color)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', (d) => Math.max(1, d.width ?? 1))
      .on('pointermove', (event: PointerEvent, d) => {
        this.showTooltip(event.clientX, event.clientY, `${formatCents(d.value ?? 0)}`);
      })
      .on('pointerleave', () => this.hideTooltip());

    const node = svg.append('g').selectAll('g').data(graph.nodes).join('g');

    node
      .append('rect')
      .attr('x', (d) => d.x0 ?? 0)
      .attr('y', (d) => d.y0 ?? 0)
      .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', (d) => (d.y1 ?? 0) - (d.y0 ?? 0))
      .attr('rx', (d) => (d.isBudget ? 4 : 0))
      .attr('fill', (d) => d.color)
      // Budgets are a pass-through balance, not a plain income/expense category — mark their
      // node with a dashed outline so that distinction reads even without hovering for the tooltip.
      .attr('stroke', (d) => (d.isBudget ? 'var(--color-text)' : 'none'))
      .attr('stroke-width', (d) => (d.isBudget ? 1.5 : 0))
      .attr('stroke-dasharray', (d) => (d.isBudget ? '4,2' : null))
      .on('pointermove', (event: PointerEvent, d) => {
        const label = d.isBudget ? `${d.name} (budget)` : d.name;
        this.showTooltip(event.clientX, event.clientY, `<strong>${label}</strong>`);
      })
      .on('pointerleave', () => this.hideTooltip());

    node
      .append('text')
      .attr('x', (d) => ((d.x0 ?? 0) < width / 2 ? (d.x1 ?? 0) + 6 : (d.x0 ?? 0) - 6))
      .attr('y', (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => ((d.x0 ?? 0) < width / 2 ? 'start' : 'end'))
      .attr('fill', 'var(--color-text)')
      .style('font-size', '12px')
      .text((d) => (d.isBudget ? `${d.name} (budget)` : d.name));
  }
}

customElements.define('sankey-chart', SankeyChart);
