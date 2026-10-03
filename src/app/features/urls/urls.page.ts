import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatChip } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRow,
  MatRowDef,
  MatTable,
} from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { ShortUrl } from '../../core/api.models';
import { errorMessage } from '../../core/http-errors';
import { provideEsPaginatorIntl } from '../../core/material-intl';
import { UrlsService } from '../../core/urls.service';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog';
import { ErrorMessage } from '../../shared/error-message';
import { UrlFormDialog, UrlFormDialogData } from './url-form-dialog';

@Component({
  selector: 'app-urls-page',
  providers: [provideEsPaginatorIntl()],
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatButton,
    MatIconButton,
    MatCard,
    MatChip,
    MatFormField,
    MatLabel,
    MatIcon,
    MatInput,
    MatPaginator,
    MatProgressBar,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatNoDataRow,
    MatRow,
    MatRowDef,
    MatTable,
    ErrorMessage,
  ],
  template: `
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <h1 class="text-2xl font-medium">Mis URLs</h1>
      <button matButton="filled" type="button" class="ml-auto" (click)="openCreate()">
        <mat-icon aria-hidden="true">add</mat-icon>
        Nueva URL
      </button>
    </div>

    <mat-form-field class="mb-4 w-full sm:max-w-sm">
      <mat-label>Buscar</mat-label>
      <input
        matInput
        id="url-search"
        type="search"
        placeholder="Código o URL de destino"
        maxlength="200"
        [value]="searchInput()"
        (input)="onSearch($event)"
      />
    </mat-form-field>

    @if (list.error(); as error) {
      <app-error-message class="mb-4">
        {{ errorMessage(error) }}
        <button matButton type="button" (click)="list.reload()">Reintentar</button>
      </app-error-message>
    }

    <mat-card appearance="outlined" class="overflow-hidden">
      @if (list.isLoading()) {
        <mat-progress-bar mode="indeterminate" aria-label="Cargando las URLs" />
      }

      <div class="overflow-x-auto">
        <table mat-table [dataSource]="rows()" [trackBy]="trackById">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef scope="col">Enlace corto</th>
            <td mat-cell *matCellDef="let url">
              <div class="flex items-center gap-1">
                <a
                  [href]="url.shortUrl"
                  target="_blank"
                  rel="noopener"
                  class="font-medium text-primary underline"
                >
                  {{ url.code }}
                </a>
                <button
                  matIconButton
                  type="button"
                  [attr.aria-label]="'Copiar ' + url.shortUrl"
                  (click)="copy(url.shortUrl)"
                >
                  <mat-icon aria-hidden="true">content_copy</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="destination">
            <th mat-header-cell *matHeaderCellDef scope="col">Destino</th>
            <td mat-cell *matCellDef="let url" class="max-w-xs truncate" [title]="url.originalUrl">
              {{ url.originalUrl }}
            </td>
          </ng-container>

          <ng-container matColumnDef="clicks">
            <th mat-header-cell *matHeaderCellDef scope="col" class="!text-right">Clicks</th>
            <td mat-cell *matCellDef="let url" class="!text-right">{{ url.clicks | number }}</td>
          </ng-container>

          <ng-container matColumnDef="expires">
            <th mat-header-cell *matHeaderCellDef scope="col">Expira</th>
            <td mat-cell *matCellDef="let url" class="whitespace-nowrap">
              @if (url.expiresAt) {
                {{ url.expiresAt | date: 'short' }}
                @if (url.expired) {
                  <mat-chip class="danger ml-1" disableRipple>Expirada</mat-chip>
                }
              } @else {
                Nunca
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="created">
            <th mat-header-cell *matHeaderCellDef scope="col">Creada</th>
            <td mat-cell *matCellDef="let url" class="whitespace-nowrap">
              {{ url.createdAt | date: 'mediumDate' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef scope="col">
              <span class="sr-only">Acciones</span>
            </th>
            <td mat-cell *matCellDef="let url">
              <div class="flex justify-end gap-1">
                <a
                  matIconButton
                  [routerLink]="['/urls', url.id]"
                  [attr.aria-label]="'Estadísticas de ' + url.code"
                >
                  <mat-icon aria-hidden="true">bar_chart</mat-icon>
                </a>
                <button
                  matIconButton
                  type="button"
                  [attr.aria-label]="'Editar ' + url.code"
                  (click)="openEdit(url)"
                >
                  <mat-icon aria-hidden="true">edit</mat-icon>
                </button>
                <button
                  matIconButton
                  type="button"
                  class="danger"
                  [attr.aria-label]="'Eliminar ' + url.code"
                  (click)="confirmDelete(url)"
                >
                  <mat-icon aria-hidden="true">delete</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
          <tr *matNoDataRow>
            <td [attr.colspan]="columns.length" class="py-8 text-center text-on-surface-variant">
              @if (!list.isLoading()) {
                {{
                  search()
                    ? 'Ninguna URL coincide con la búsqueda.'
                    : 'Todavía no has creado ninguna URL.'
                }}
              }
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="list.value()?.total ?? 0"
        [pageIndex]="page() - 1"
        [pageSize]="limit()"
        [pageSizeOptions]="[10, 20, 50]"
        aria-label="Paginación de URLs"
        (page)="onPage($event)"
      />
    </mat-card>
  `,
})
export class UrlsPage {
  private readonly urls = inject(UrlsService);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly errorMessage = errorMessage;
  protected readonly columns = ['code', 'destination', 'clicks', 'expires', 'created', 'actions'];

  protected readonly searchInput = signal('');
  protected readonly search = toSignal(
    toObservable(this.searchInput).pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );
  protected readonly limit = signal(10);
  /** Back to the first page whenever the search changes. */
  protected readonly page = linkedSignal(() => {
    this.search();
    return 1;
  });

  protected readonly list = rxResource({
    params: () => ({ page: this.page(), limit: this.limit(), search: this.search().trim() }),
    stream: ({ params }) => this.urls.list(params),
  });

  protected readonly rows = computed(() => {
    const now = Date.now();
    return (this.list.value()?.items ?? []).map((url) => ({
      ...url,
      expired: url.expiresAt !== null && new Date(url.expiresAt).getTime() <= now,
    }));
  });

  protected trackById(_index: number, url: ShortUrl): number {
    return url.id;
  }

  protected onPage({ pageIndex, pageSize }: PageEvent): void {
    this.limit.set(pageSize);
    this.page.set(pageIndex + 1);
  }

  protected onSearch(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  protected openCreate(): void {
    this.openForm(null);
  }

  protected openEdit(url: ShortUrl): void {
    this.openForm(url);
  }

  protected onSaved(): void {
    this.notify('URL guardada');
    this.list.reload();
  }

  protected copy(shortUrl: string): void {
    this.notify(
      this.clipboard.copy(shortUrl) ? `Enlace copiado: ${shortUrl}` : 'No se pudo copiar el enlace',
    );
  }

  protected confirmDelete(url: ShortUrl): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        role: 'alertdialog',
        data: {
          title: 'Eliminar URL',
          message: `¿Eliminar ${url.shortUrl}? También se borrará su historial de clicks.`,
          confirmLabel: 'Eliminar',
        },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.urls.remove(url.id)),
      )
      .subscribe({
        next: () => {
          this.notify('URL eliminada');
          // Removing the only row of the last page: step back instead of showing an empty page.
          if (this.rows().length === 1 && this.page() > 1) {
            this.page.update((page) => page - 1);
          } else {
            this.list.reload();
          }
        },
        error: (error: unknown) => this.notify(errorMessage(error)),
      });
  }

  private openForm(url: ShortUrl | null): void {
    this.dialog
      .open<UrlFormDialog, UrlFormDialogData, ShortUrl>(UrlFormDialog, {
        data: { url },
        width: '36rem',
        maxWidth: 'calc(100vw - 2rem)',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.onSaved());
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
