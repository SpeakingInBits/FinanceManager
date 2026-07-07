import css from './chart-base.css?inline';
import { adoptStyles } from '@/utils/adopt-styles';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Base class for D3-driven chart custom elements: owns a responsive SVG + tooltip. */
export abstract class ChartBase extends HTMLElement {
  protected svg: SVGSVGElement;
  protected tooltip: HTMLDivElement;
  private resizeObserver: ResizeObserver;
  private frame = 0;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    adoptStyles(root, css);
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    root.append(this.svg, this.tooltip);
    this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
  }

  connectedCallback(): void {
    this.resizeObserver.observe(this);
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    this.resizeObserver.disconnect();
    cancelAnimationFrame(this.frame);
  }

  protected scheduleRender(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const width = this.clientWidth || 320;
      const height = this.clientHeight || 240;
      this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      this.renderChart(width, height);
    });
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
