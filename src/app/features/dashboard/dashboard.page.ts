import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { AnalyticsService } from '../../core/analytics.service';
import { errorMessage } from '../../core/http-errors';
import { ClicksChart } from '../../shared/clicks-chart';

@Component({
  selector: 'app-dashboard-page',
  imports: [DecimalPipe, RouterLink, ButtonModule, MessageModule, SkeletonModule, ClicksChart],
  template: `
    <h1 class="mb-6 text-2xl font-semibold">Dashboard</h1>

    @if (overview.error(); as error) {
      <p-message severity="error">
        {{ errorMessage(error) }}
        <button pButton type="button" [link]="true" (click)="overview.reload()">Reintentar</button>
      </p-message>
    } @else if (overview.value(); as data) {
      <dl class="mb-8 grid gap-4 sm:grid-cols-3">
        @for (kpi of kpis(); track kpi.label) {
          <div class="rounded-xl bg-surface-0 p-5 shadow-sm">
            <dt class="text-sm text-surface-700">{{ kpi.label }}</dt>
            <dd class="mt-1 text-3xl font-semibold">{{ kpi.value | number }}</dd>
          </div>
        }
      </dl>

      <section class="mb-8 rounded-xl bg-surface-0 p-5 shadow-sm" aria-labelledby="daily-title">
        <h2 id="daily-title" class="mb-4 text-lg font-semibold">Clicks por día</h2>
        <app-clicks-chart [days]="data.clicksByDay" label="Clicks por día en los últimos 30 días" />
      </section>

      <section class="rounded-xl bg-surface-0 p-5 shadow-sm" aria-labelledby="top-title">
        <h2 id="top-title" class="mb-4 text-lg font-semibold">URLs más visitadas</h2>
        @if (data.topUrls.length) {
          <ol class="divide-y divide-surface-200">
            @for (url of data.topUrls; track url.id) {
              <li class="flex items-center gap-4 py-3">
                <div class="min-w-0 flex-1">
                  <a
                    [routerLink]="['/urls', url.id]"
                    class="font-medium text-primary-700 underline"
                  >
                    {{ url.code }}
                  </a>
                  <p class="truncate text-sm text-surface-700">{{ url.originalUrl }}</p>
                </div>
                <span class="whitespace-nowrap font-semibold"
                  >{{ url.clicks | number }} clicks</span
                >
              </li>
            }
          </ol>
        } @else {
          <p class="text-surface-700">
            Todavía no tienes URLs.
            <a routerLink="/urls" class="text-primary-700 underline">Crea la primera</a>.
          </p>
        }
      </section>
    } @else {
      <div class="grid gap-4 sm:grid-cols-3" aria-busy="true">
        <p-skeleton height="6rem" />
        <p-skeleton height="6rem" />
        <p-skeleton height="6rem" />
      </div>
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
