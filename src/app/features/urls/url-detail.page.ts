import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ArrowLeft } from '@primeicons/angular/arrow-left';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { AnalyticsService } from '../../core/analytics.service';
import { errorMessage } from '../../core/http-errors';
import { UrlsService } from '../../core/urls.service';
import { BreakdownChart } from '../../shared/breakdown-chart';
import { ClicksChart } from '../../shared/clicks-chart';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

@Component({
  selector: 'app-url-detail-page',
  imports: [
    DatePipe,
    DecimalPipe,
    FormField,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    MessageModule,
    SkeletonModule,
    BreakdownChart,
    ClicksChart,
    ArrowLeft,
  ],
  template: `
    <a routerLink="/urls" class="mb-4 inline-flex items-center gap-2 text-primary-700 underline">
      <svg data-p-icon="arrow-left" aria-hidden="true" [size]="14"></svg>
      Volver a mis URLs
    </a>

    @if (urlError(); as urlError) {
      <p-message severity="error">{{ urlError }}</p-message>
    } @else if (url.value(); as current) {
      <header class="mb-6">
        <h1 class="text-2xl font-semibold">{{ current.code }}</h1>
        <p class="mt-1 break-all text-surface-700">
          <a
            [href]="current.shortUrl"
            target="_blank"
            rel="noopener"
            class="text-primary-700 underline"
          >
            {{ current.shortUrl }}
          </a>
          → {{ current.originalUrl }}
        </p>
        <p class="mt-1 text-sm text-surface-700">
          Creada el {{ current.createdAt | date: 'medium' }} · {{ current.clicks | number }} clicks
          en total ·
          @if (current.expiresAt) {
            expira el {{ current.expiresAt | date: 'medium' }}
          } @else {
            no expira
          }
        </p>
      </header>

      <div class="mb-6 flex flex-col gap-2 sm:max-w-sm">
        <label for="stats-range" class="font-medium">Periodo</label>
        <p-datepicker
          inputId="stats-range"
          selectionMode="range"
          dateFormat="dd/mm/yy"
          [showIcon]="true"
          [readonlyInput]="true"
          [maxDate]="today"
          [fluid]="true"
          [formField]="rangeField"
        />
        @if (rangeError()) {
          <small class="text-red-700" aria-live="polite">{{ rangeError() }}</small>
        }
      </div>

      @if (!apiRange()) {
        <p class="text-surface-700">Elige el día final del periodo.</p>
      } @else if (stats.error(); as error) {
        <p-message severity="error">{{ errorMessage(error) }}</p-message>
      } @else if (stats.value(); as data) {
        <section class="mb-6 rounded-xl bg-surface-0 p-5 shadow-sm" aria-labelledby="daily-title">
          <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="daily-title" class="text-lg font-semibold">Clicks por día</h2>
            <p class="text-surface-700">
              {{ data.totalClicks | number }} clicks entre {{ data.from | date: 'mediumDate' }} y
              {{ data.to | date: 'mediumDate' }}
            </p>
          </div>
          <app-clicks-chart [days]="data.clicksByDay" label="Clicks por día en el periodo" />
        </section>

        <section aria-label="Desglose de clicks" class="grid gap-6 md:grid-cols-2">
          @for (breakdown of breakdowns(); track breakdown.title) {
            <div class="rounded-xl bg-surface-0 p-5 shadow-sm">
              <app-breakdown-chart [title]="breakdown.title" [items]="breakdown.items" />
            </div>
          }
        </section>
      } @else {
        <p-skeleton height="18rem" />
      }
    } @else {
      <p-skeleton height="4rem" styleClass="mb-6" />
      <p-skeleton height="18rem" />
    }
  `,
})
export class UrlDetailPage {
  private readonly urls = inject(UrlsService);
  private readonly analytics = inject(AnalyticsService);

  readonly id = input.required({ transform: numberAttribute });

  protected readonly errorMessage = errorMessage;
  protected readonly today = new Date();
  /** Local calendar days picked by the user. While half selected, the end is `null` at runtime. */
  protected readonly range = signal<Date[] | null>([
    new Date(this.today.getTime() - 29 * DAY_MS),
    this.today,
  ]);

  protected readonly rangeField = form(this.range);

  /** Whole local days, as the API's half-open `[from, to)` interval. */
  protected readonly apiRange = computed(() => {
    const [start, end] = (this.range() ?? []) as (Date | null | undefined)[];
    if (!start || !end) {
      return null;
    }
    const from = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const to = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
    return { from, to };
  });

  protected readonly rangeError = computed(() => {
    const range = this.apiRange();
    return range && range.to.getTime() - range.from.getTime() > MAX_RANGE_DAYS * DAY_MS
      ? `El periodo no puede superar ${MAX_RANGE_DAYS} días.`
      : null;
  });

  protected readonly url = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.urls.get(id),
  });

  protected readonly urlError = computed(() => {
    const error = this.url.error();
    return error ? errorMessage(error, { 404: 'Esta URL no existe o no es tuya.' }) : null;
  });

  protected readonly stats = rxResource({
    // `undefined` params leave the resource idle while the range is incomplete or invalid.
    params: () => {
      const range = this.apiRange();
      return range && !this.rangeError() ? { id: this.id(), range } : undefined;
    },
    stream: ({ params }) => this.analytics.urlStats(params.id, params.range),
  });

  protected readonly breakdowns = computed(() => {
    const data = this.stats.value();
    return data
      ? [
          { title: 'Referentes', items: data.topReferrers },
          { title: 'Navegadores', items: data.browsers },
          { title: 'Sistemas operativos', items: data.os },
          { title: 'Dispositivos', items: data.devices },
        ]
      : [];
  });
}
