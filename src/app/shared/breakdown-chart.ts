import { Component, computed, input } from '@angular/core';
import { Breakdown } from '../core/api.models';
import { Chart } from './chart';
import { CHART_GRID, CHART_PRIMARY } from './chart-theme';

/** Horizontal bar chart for a top-10 breakdown, with the same data as a screen-reader table. */
@Component({
  selector: 'app-breakdown-chart',
  imports: [Chart],
  template: `
    <h3 class="mb-3 font-semibold">{{ title() }}</h3>
    @if (items().length) {
      <div class="h-64">
        <app-chart type="bar" [data]="data()" [options]="options" [ariaLabel]="title()" />
      </div>
      <table class="sr-only">
        <caption>
          {{
            title()
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Clicks</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.label) {
            <tr>
              <td>{{ item.label }}</td>
              <td>{{ item.clicks }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p class="text-on-surface-variant">Sin datos en este periodo.</p>
    }
  `,
})
export class BreakdownChart {
  readonly title = input.required<string>();
  readonly items = input.required<Breakdown[]>();

  protected readonly data = computed(() => ({
    labels: this.items().map(({ label }) => label),
    datasets: [
      {
        label: 'Clicks',
        data: this.items().map(({ clicks }) => clicks),
        backgroundColor: CHART_PRIMARY,
        borderRadius: 4,
      },
    ],
  }));

  protected readonly options = {
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: CHART_GRID } },
      y: { grid: { display: false } },
    },
  };
}
