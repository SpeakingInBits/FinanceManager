import css from './chart-base.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Base class for D3-driven chart custom elements: owns a responsive SVG + tooltip + legend. */
export abstract class ChartBase extends HTMLElement {
  protected svg: SVGSVGElement;
  protected tooltip: HTMLDivElement;
  protected legend: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private lastWidth = -1;
  private lastHeight = -1;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    this.legend = document.createElement('div');
    this.legend.className = 'legend';
    root.append(this.svg, this.tooltip, this.legend);
    // Observe the svg itself (not the host) so adding/resizing the legend — which shrinks the
    // svg via flexbox without changing the host's own size — still triggers a re-measure. Only
    // re-render when the size actually changed, so a render that itself changes the legend's
    // (and therefore the svg's) size can't turn into a resize/render feedback loop.
    this.resizeObserver = new ResizeObserver(() => {
      const width = this.svg.clientWidth || 320;
      const height = this.svg.clientHeight || 240;
      if (width !== this.lastWidth || height !== this.lastHeight) this.scheduleRender();
    });
  }

  connectedCallback(): void {
    this.resizeObserver.observe(this.svg);
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.frame);
  }

  protected scheduleRender(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const width = this.svg.clientWidth || 320;
      const height = this.svg.clientHeight || 240;
      this.lastWidth = width;
      this.lastHeight = height;
      this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this.renderChart(width, height);
    });
  }

  /** Renders a static key of color swatches + labels below the chart, for touch devices with no hover. */
  protected setLegend(items: { label: string; color: string }[]): void {
    this.legend.innerHTML = items
      .map(
        (item) =>
          `<span class="legend-item"><span class="legend-swatch" style="background:${item.color}"></span>${item.label}</span>`,
      )
      .join('');
  }

  protected showTooltip(x: number, y: number, html: string): void {
    this.tooltip.innerHTML = html;
    this.tooltip.style.left = `${x + 12}px`;
    this.tooltip.style.top = `${y + 12}px`;
    this.tooltip.classList.add('visible');
  }

  protected hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  protected abstract renderChart(width: number, height: number): void;
}
