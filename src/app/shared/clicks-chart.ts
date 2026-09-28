import { Component, computed, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { DailyClicks } from '../core/api.models';
import { CHART_GRID, CHART_PRIMARY, CHART_PRIMARY_FILL } from './chart-theme';

/** Line chart of clicks per UTC day, with the same data as a screen-reader table. */
@Component({
  selector: 'app-clicks-chart',
  imports: [ChartModule],
  template: `
    <div class="h-72">
      <p-chart
        type="line"
        height="100%"
        [data]="data()"
        [options]="options"
        [ariaLabel]="label()"
      />
    </div>
    <table class="sr-only">
      <caption>
        {{
          label()
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Día</th>
          <th scope="col">Clicks</th>
        </tr>
      </thead>
      <tbody>
        @for (day of days(); track day.date) {
          <tr>
            <td>{{ day.date }}</td>
            <td>{{ day.clicks }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class ClicksChart {
  readonly days = input.required<DailyClicks[]>();
  readonly label = input.required<string>();

  protected readonly data = computed(() => ({
    // `YYYY-MM-DD` → `DD/MM`
    labels: this.days().map(({ date }) => `${date.slice(8, 10)}/${date.slice(5, 7)}`),
    datasets: [
      {
        label: 'Clicks',
        data: this.days().map(({ clicks }) => clicks),
        borderColor: CHART_PRIMARY,
        backgroundColor: CHART_PRIMARY_FILL,
        fill: true,
        tension: 0.3,
      },
    ],
  }));

  protected readonly options = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: CHART_GRID } },
    },
  };
}
