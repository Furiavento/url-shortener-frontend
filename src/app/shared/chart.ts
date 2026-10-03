import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { Chart as ChartJs, ChartData, ChartOptions, ChartType } from 'chart.js';

/**
 * Renders a Chart.js chart. Chart.js is loaded lazily in the browser only, so nothing runs on
 * the server. The host must have a height when `maintainAspectRatio` is `false`.
 */
@Component({
  selector: 'app-chart',
  template: `<canvas #canvas role="img" [attr.aria-label]="ariaLabel()"></canvas>`,
  host: { class: 'relative block h-full' },
})
export class Chart {
  readonly type = input.required<ChartType>();
  readonly data = input.required<ChartData>();
  readonly options = input<ChartOptions>({});
  readonly ariaLabel = input.required<string>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly chart = signal<ChartJs | undefined>(undefined);

  constructor() {
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      this.chart()?.destroy();
    });

    afterNextRender(async () => {
      const { default: ChartJs } = await import('chart.js/auto');
      if (destroyed) {
        return;
      }
      this.chart.set(
        new ChartJs(this.canvas().nativeElement, {
          type: untracked(this.type),
          data: untracked(this.data),
          options: untracked(this.options),
        }),
      );
    });

    // Redraw with new data, e.g. when the stats period changes.
    effect(() => {
      const data = this.data();
      const chart = untracked(this.chart);
      if (chart && chart.data !== data) {
        chart.data = data;
        chart.update();
      }
    });
  }
}
