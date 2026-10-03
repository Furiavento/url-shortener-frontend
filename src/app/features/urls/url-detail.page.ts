import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatDateRangeInput,
  MatDateRangePicker,
  MatDatepickerToggle,
  MatEndDate,
  MatStartDate,
} from '@angular/material/datepicker';
import { MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { errorMessage } from '../../core/http-errors';
import { provideEsDatepickerIntl } from '../../core/material-intl';
import { UrlsService } from '../../core/urls.service';
import { BreakdownChart } from '../../shared/breakdown-chart';
import { ClicksChart } from '../../shared/clicks-chart';
import { ErrorMessage } from '../../shared/error-message';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

@Component({
  selector: 'app-url-detail-page',
  providers: [provideEsDatepickerIntl()],
  imports: [
    DatePipe,
    DecimalPipe,
    FormField,
    RouterLink,
    MatButton,
    MatCard,
    MatCardContent,
    MatDateRangeInput,
    MatDateRangePicker,
    MatDatepickerToggle,
    MatEndDate,
    MatStartDate,
    MatFormField,
    MatHint,
    MatLabel,
    MatSuffix,
    MatIcon,
    MatProgressBar,
    BreakdownChart,
    ClicksChart,
    ErrorMessage,
  ],
  template: `
    <a matButton routerLink="/urls" class="mb-4">
      <mat-icon aria-hidden="true">arrow_back</mat-icon>
      Volver a mis URLs
    </a>

    @if (urlError(); as urlError) {
      <app-error-message>{{ urlError }}</app-error-message>
    } @else if (url.value(); as current) {
      <header class="mb-6">
        <h1 class="text-2xl font-medium">{{ current.code }}</h1>
        <p class="mt-1 break-all text-on-surface-variant">
          <a
            [href]="current.shortUrl"
            target="_blank"
            rel="noopener"
            class="text-primary underline"
          >
            {{ current.shortUrl }}
          </a>
          → {{ current.originalUrl }}
        </p>
        <p class="mt-1 text-sm text-on-surface-variant">
          Creada el {{ current.createdAt | date: 'medium' }} · {{ current.clicks | number }} clicks
          en total ·
          @if (current.expiresAt) {
            expira el {{ current.expiresAt | date: 'medium' }}
          } @else {
            no expira
          }
        </p>
      </header>

      <mat-form-field class="mb-6 w-full sm:max-w-sm">
        <mat-label>Periodo</mat-label>
        <mat-date-range-input [rangePicker]="rangePicker" [max]="today">
          <input matStartDate placeholder="Inicio" [formField]="rangeForm.start" />
          <input matEndDate placeholder="Fin" [formField]="rangeForm.end" />
        </mat-date-range-input>
        <mat-datepicker-toggle matIconSuffix [for]="rangePicker" />
        <mat-date-range-picker #rangePicker />
        <mat-hint aria-live="polite" [style.color]="rangeError() ? 'var(--mat-sys-error)' : null">
          {{ rangeError() ?? 'dd/mm/aaaa – dd/mm/aaaa' }}
        </mat-hint>
      </mat-form-field>

      @if (!apiRange()) {
        <p class="text-on-surface-variant">Elige el día final del periodo.</p>
      } @else if (stats.error(); as error) {
        <app-error-message>{{ errorMessage(error) }}</app-error-message>
      } @else if (stats.value(); as data) {
        <mat-card appearance="outlined" class="mb-6">
          <mat-card-content>
            <section aria-labelledby="daily-title">
              <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="daily-title" class="text-lg font-medium">Clicks por día</h2>
                <p class="text-on-surface-variant">
                  {{ data.totalClicks | number }} clicks entre
                  {{ data.from | date: 'mediumDate' }} y {{ data.to | date: 'mediumDate' }}
                </p>
              </div>
              <app-clicks-chart [days]="data.clicksByDay" label="Clicks por día en el periodo" />
            </section>
          </mat-card-content>
        </mat-card>

        <section aria-label="Desglose de clicks" class="grid gap-6 md:grid-cols-2">
          @for (breakdown of breakdowns(); track breakdown.title) {
            <mat-card appearance="outlined">
              <mat-card-content>
                <app-breakdown-chart [title]="breakdown.title" [items]="breakdown.items" />
              </mat-card-content>
            </mat-card>
          }
        </section>
      } @else if (!rangeError()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando las estadísticas" />
      }
    } @else {
      <mat-progress-bar mode="indeterminate" aria-label="Cargando la URL" />
    }
  `,
})
export class UrlDetailPage {
  private readonly urls = inject(UrlsService);
  private readonly analytics = inject(AnalyticsService);

  readonly id = input.required({ transform: numberAttribute });

  protected readonly errorMessage = errorMessage;
  protected readonly today = new Date();
  /** Local calendar days picked by the user. While half selected, the end is `null`. */
  protected readonly range = signal<{ start: Date | null; end: Date | null }>({
    start: new Date(this.today.getTime() - 29 * DAY_MS),
    end: this.today,
  });

  protected readonly rangeForm = form(this.range);

  /** Whole local days, as the API's half-open `[from, to)` interval. */
  protected readonly apiRange = computed(() => {
    const { start, end } = this.range();
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
