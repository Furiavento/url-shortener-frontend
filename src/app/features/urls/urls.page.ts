import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ChartBar } from '@primeicons/angular/chart-bar';
import { Copy } from '@primeicons/angular/copy';
import { Pencil } from '@primeicons/angular/pencil';
import { Plus } from '@primeicons/angular/plus';
import { Trash } from '@primeicons/angular/trash';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TableLazyLoadEvent } from 'primeng/types/table';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ShortUrl } from '../../core/api.models';
import { errorMessage } from '../../core/http-errors';
import { UrlsService } from '../../core/urls.service';
import { UrlFormDialog } from './url-form-dialog';

@Component({
  selector: 'app-urls-page',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TagModule,
    UrlFormDialog,
    ChartBar,
    Copy,
    Pencil,
    Plus,
    Trash,
  ],
  template: `
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <h1 class="text-2xl font-semibold">Mis URLs</h1>
      <button pButton type="button" class="ml-auto" (click)="openCreate()">
        <svg data-p-icon="plus" aria-hidden="true" [size]="16"></svg>
        Nueva URL
      </button>
    </div>

    <div class="mb-4 flex flex-col gap-2 sm:max-w-sm">
      <label for="url-search" class="font-medium">Buscar</label>
      <input
        pInputText
        id="url-search"
        type="search"
        placeholder="Código o URL de destino"
        maxlength="200"
        [value]="searchInput()"
        (input)="onSearch($event)"
      />
    </div>

    @if (list.error(); as error) {
      <p-message severity="error" styleClass="mb-4">
        {{ errorMessage(error) }}
        <button pButton type="button" [link]="true" (click)="list.reload()">Reintentar</button>
      </p-message>
    }

    <p-table
      [value]="rows()"
      [lazy]="true"
      [paginator]="true"
      [rows]="limit()"
      [first]="(page() - 1) * limit()"
      [totalRecords]="list.value()?.total ?? 0"
      [rowsPerPageOptions]="[10, 20, 50]"
      [loading]="list.isLoading()"
      dataKey="id"
      (onLazyLoad)="onPage($event)"
      styleClass="rounded-xl bg-surface-0 shadow-sm"
    >
      <ng-template #header>
        <tr>
          <th scope="col">Enlace corto</th>
          <th scope="col">Destino</th>
          <th scope="col" class="text-right">Clicks</th>
          <th scope="col">Expira</th>
          <th scope="col">Creada</th>
          <th scope="col"><span class="sr-only">Acciones</span></th>
        </tr>
      </ng-template>

      <ng-template #body let-url>
        <tr>
          <td>
            <div class="flex items-center gap-1">
              <a
                [href]="url.shortUrl"
                target="_blank"
                rel="noopener"
                class="font-medium text-primary-700 underline"
              >
                {{ url.code }}
              </a>
              <button
                pButton
                type="button"
                [text]="true"
                severity="secondary"
                size="small"
                [attr.aria-label]="'Copiar ' + url.shortUrl"
                (click)="copy(url.shortUrl)"
              >
                <svg data-p-icon="copy" aria-hidden="true" [size]="14"></svg>
              </button>
            </div>
          </td>
          <td class="max-w-xs truncate" [title]="url.originalUrl">{{ url.originalUrl }}</td>
          <td class="text-right">{{ url.clicks | number }}</td>
          <td>
            @if (url.expiresAt) {
              {{ url.expiresAt | date: 'short' }}
              @if (url.expired) {
                <p-tag severity="danger" value="Expirada" styleClass="ml-1" />
              }
            } @else {
              Nunca
            }
          </td>
          <td>{{ url.createdAt | date: 'mediumDate' }}</td>
          <td>
            <div class="flex justify-end gap-1">
              <a
                pButton
                [text]="true"
                severity="secondary"
                size="small"
                [routerLink]="['/urls', url.id]"
                [attr.aria-label]="'Estadísticas de ' + url.code"
              >
                <svg data-p-icon="chart-bar" aria-hidden="true" [size]="16"></svg>
              </a>
              <button
                pButton
                type="button"
                [text]="true"
                severity="secondary"
                size="small"
                [attr.aria-label]="'Editar ' + url.code"
                (click)="openEdit(url)"
              >
                <svg data-p-icon="pencil" aria-hidden="true" [size]="16"></svg>
              </button>
              <button
                pButton
                type="button"
                [text]="true"
                severity="danger"
                size="small"
                [attr.aria-label]="'Eliminar ' + url.code"
                (click)="confirmDelete(url)"
              >
                <svg data-p-icon="trash" aria-hidden="true" [size]="16"></svg>
              </button>
            </div>
          </td>
        </tr>
      </ng-template>

      <ng-template #emptymessage>
        <tr>
          <td colspan="6" class="py-8 text-center text-surface-700">
            {{
              search()
                ? 'Ninguna URL coincide con la búsqueda.'
                : 'Todavía no has creado ninguna URL.'
            }}
          </td>
        </tr>
      </ng-template>
    </p-table>

    <app-url-form-dialog [(visible)]="dialogVisible" [url]="editing()" (saved)="onSaved()" />
  `,
})
export class UrlsPage {
  private readonly urls = inject(UrlsService);
  private readonly clipboard = inject(Clipboard);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly errorMessage = errorMessage;

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

  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<ShortUrl | null>(null);

  protected onPage({ first, rows }: TableLazyLoadEvent): void {
    const limit = rows ?? this.limit();
    this.limit.set(limit);
    this.page.set(Math.floor((first ?? 0) / limit) + 1);
  }

  protected onSearch(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(url: ShortUrl): void {
    this.editing.set(url);
    this.dialogVisible.set(true);
  }

  protected onSaved(): void {
    this.messages.add({ severity: 'success', summary: 'URL guardada' });
    this.list.reload();
  }

  protected copy(shortUrl: string): void {
    const copied = this.clipboard.copy(shortUrl);
    this.messages.add(
      copied
        ? { severity: 'success', summary: 'Enlace copiado', detail: shortUrl }
        : { severity: 'error', summary: 'No se pudo copiar el enlace' },
    );
  }

  protected confirmDelete(url: ShortUrl): void {
    this.confirmation.confirm({
      header: 'Eliminar URL',
      message: `¿Eliminar ${url.shortUrl}? También se borrará su historial de clicks.`,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.urls.remove(url.id).subscribe({
          next: () => {
            this.messages.add({ severity: 'success', summary: 'URL eliminada' });
            // Removing the only row of the last page: step back instead of showing an empty page.
            if (this.rows().length === 1 && this.page() > 1) {
              this.page.update((page) => page - 1);
            } else {
              this.list.reload();
            }
          },
          error: (error: unknown) =>
            this.messages.add({ severity: 'error', summary: errorMessage(error) }),
        }),
    });
  }
}
