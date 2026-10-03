import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { errorMessage } from '../../core/http-errors';
import { ClicksChart } from '../../shared/clicks-chart';
import { ErrorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    DecimalPipe,
    RouterLink,
    MatButton,
    MatCard,
    MatCardContent,
    MatProgressBar,
    ClicksChart,
    ErrorMessage,
  ],
  template: `
    <h1 class="mb-6 text-2xl font-medium">Dashboard</h1>

    @if (overview.error(); as error) {
      <app-error-message>
        {{ errorMessage(error) }}
        <button matButton type="button" (click)="overview.reload()">Reintentar</button>
      </app-error-message>
    } @else if (overview.value(); as data) {
      <div class="mb-8 grid gap-4 sm:grid-cols-3">
        @for (kpi of kpis(); track kpi.label) {
          <mat-card appearance="outlined">
            <mat-card-content>
              <dl>
                <dt class="text-sm text-on-surface-variant">{{ kpi.label }}</dt>
                <dd class="mt-1 text-3xl font-medium">{{ kpi.value | number }}</dd>
              </dl>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <mat-card appearance="outlined" class="mb-8">
        <mat-card-content>
          <section aria-labelledby="daily-title">
            <h2 id="daily-title" class="mb-4 text-lg font-medium">Clicks por día</h2>
            <app-clicks-chart
              [days]="data.clicksByDay"
              label="Clicks por día en los últimos 30 días"
            />
          </section>
        </mat-card-content>
      </mat-card>

      <mat-card appearance="outlined">
        <mat-card-content>
          <section aria-labelledby="top-title">
            <h2 id="top-title" class="mb-4 text-lg font-medium">URLs más visitadas</h2>
            @if (data.topUrls.length) {
              <ol class="divide-y divide-outline-variant">
                @for (url of data.topUrls; track url.id) {
                  <li class="flex items-center gap-4 py-3">
                    <div class="min-w-0 flex-1">
                      <a
                        [routerLink]="['/urls', url.id]"
                        class="font-medium text-primary underline"
                      >
                        {{ url.code }}
                      </a>
                      <p class="truncate text-sm text-on-surface-variant">{{ url.originalUrl }}</p>
                    </div>
                    <span class="whitespace-nowrap font-medium"
                      >{{ url.clicks | number }} clicks</span
                    >
                  </li>
                }
              </ol>
            } @else {
              <p class="text-on-surface-variant">
                Todavía no tienes URLs.
                <a routerLink="/urls" class="text-primary underline">Crea la primera</a>.
              </p>
            }
          </section>
        </mat-card-content>
      </mat-card>
    } @else {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando el dashboard" />
    }
  `,
})
export class DashboardPage {
  private readonly analytics = inject(AnalyticsService);

  protected readonly overview = rxResource({ stream: () => this.analytics.overview() });
  protected readonly errorMessage = errorMessage;

  protected readonly kpis = computed(() => {
    const data = this.overview.value();
    return data
      ? [
          { label: 'URLs creadas', value: data.totalUrls },
          { label: 'Clicks totales', value: data.totalClicks },
          { label: 'Clicks (últimos 30 días)', value: data.clicksLast30Days },
        ]
      : [];
  });
}
