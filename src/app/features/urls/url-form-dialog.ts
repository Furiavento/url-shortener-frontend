import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, required, validate } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
} from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatTimepicker,
  MatTimepickerInput,
  MatTimepickerToggle,
} from '@angular/material/timepicker';
import { firstValueFrom } from 'rxjs';
import { ShortUrl } from '../../core/api.models';
import { errorMessage } from '../../core/http-errors';
import { provideEsDatepickerIntl } from '../../core/material-intl';
import { UrlsService } from '../../core/urls.service';
import { ErrorMessage } from '../../shared/error-message';

export interface UrlFormDialogData {
  /** The URL being edited; `null` to create a new one. */
  url: ShortUrl | null;
}

interface UrlFormModel {
  url: string;
  alias: string;
  expiresAt: Date | null;
}

const HTTP_URL = /^https?:\/\/\S+$/i;
const ALIAS = /^[A-Za-z0-9_-]{3,16}$/;

/**
 * Dialog content that creates a short URL, or edits the destination and expiration of
 * `data.url`. Closes with the saved URL.
 */
@Component({
  selector: 'app-url-form-dialog',
  providers: [provideEsDatepickerIntl()],
  imports: [
    FormRoot,
    FormField,
    MatButton,
    MatIconButton,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatError,
    MatFormField,
    MatHint,
    MatLabel,
    MatSuffix,
    MatIcon,
    MatInput,
    MatProgressSpinner,
    MatTimepicker,
    MatTimepickerInput,
    MatTimepickerToggle,
    ErrorMessage,
  ],
  template: `
    <h2 mat-dialog-title>{{ url ? 'Editar URL' : 'Nueva URL' }}</h2>

    <form [formRoot]="urlForm">
      <mat-dialog-content class="flex flex-col gap-4">
        @if (serverError(); as serverError) {
          <app-error-message>{{ serverError }}</app-error-message>
        }

        <mat-form-field class="mt-2">
          <mat-label>URL de destino</mat-label>
          <input
            matInput
            id="url-destination"
            type="url"
            placeholder="https://ejemplo.com/pagina"
            [formField]="urlForm.url"
          />
          <mat-error>{{ urlForm.url().errors()[0]?.message }}</mat-error>
        </mat-form-field>

        @if (url; as current) {
          <p class="text-sm text-on-surface-variant">
            Código: <strong>{{ current.code }}</strong> (no se puede cambiar)
          </p>
        } @else {
          <mat-form-field>
            <mat-label>Alias personalizado (opcional)</mat-label>
            <input matInput id="url-alias" [formField]="urlForm.alias" />
            <mat-hint>
              De 3 a 16 letras, números, guiones o guiones bajos. Si lo dejas vacío se genera uno.
            </mat-hint>
            <mat-error>{{ urlForm.alias().errors()[0]?.message }}</mat-error>
          </mat-form-field>
        }

        <div class="flex flex-col gap-4 sm:flex-row">
          <mat-form-field class="sm:flex-1">
            <mat-label>Expira el (opcional)</mat-label>
            <input
              matInput
              id="url-expires"
              placeholder="dd/mm/aaaa"
              [matDatepicker]="datePicker"
              [min]="minDate"
              [formField]="urlForm.expiresAt"
            />
            @if (urlForm.expiresAt().value()) {
              <button
                matIconButton
                matIconSuffix
                type="button"
                aria-label="Quitar la fecha de expiración"
                (click)="urlForm.expiresAt().value.set(null)"
              >
                <mat-icon aria-hidden="true">close</mat-icon>
              </button>
            }
            <mat-datepicker-toggle matIconSuffix [for]="datePicker" />
            <mat-datepicker #datePicker />
            <mat-error>{{ urlForm.expiresAt().errors()[0]?.message }}</mat-error>
          </mat-form-field>

          <mat-form-field class="sm:w-40">
            <mat-label>Hora</mat-label>
            <input
              matInput
              id="url-expires-time"
              [matTimepicker]="timePicker"
              [formField]="urlForm.expiresAt"
            />
            <mat-timepicker-toggle
              matIconSuffix
              [for]="timePicker"
              aria-label="Abrir las opciones de hora"
            />
            <mat-timepicker #timePicker aria-label="Horas" />
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancelar</button>
        <button
          matButton="filled"
          type="submit"
          [disabled]="urlForm().submitting()"
          [showProgress]="urlForm().submitting()"
        >
          <mat-spinner progressIndicator diameter="20" aria-label="Guardando" />
          {{ url ? 'Guardar' : 'Crear' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class UrlFormDialog {
  private readonly urls = inject(UrlsService);
  private readonly dialogRef = inject<MatDialogRef<UrlFormDialog, ShortUrl>>(MatDialogRef);

  protected readonly url = inject<UrlFormDialogData>(MAT_DIALOG_DATA).url;

  protected readonly serverError = signal<string | null>(null);
  protected readonly minDate = new Date();

  protected readonly urlForm = form(
    signal<UrlFormModel>({
      url: this.url?.originalUrl ?? '',
      alias: '',
      expiresAt: this.url?.expiresAt ? new Date(this.url.expiresAt) : null,
    }),
    (path) => {
      required(path.url, { message: 'Introduce la URL de destino.' });
      maxLength(path.url, 2048, { message: 'Máximo 2048 caracteres.' });
      validate(path.url, ({ value }) =>
        value() && !HTTP_URL.test(value())
          ? { kind: 'httpUrl', message: 'Debe empezar por http:// o https://.' }
          : undefined,
      );
      validate(path.alias, ({ value }) =>
        value() && !ALIAS.test(value())
          ? { kind: 'alias', message: 'De 3 a 16 caracteres: letras, números, - o _.' }
          : undefined,
      );
      validate(path.expiresAt, ({ value }) =>
        value() && value()!.getTime() <= Date.now()
          ? { kind: 'past', message: 'La fecha debe ser futura.' }
          : undefined,
      );
    },
    {
      submission: {
        action: async (field) => {
          this.serverError.set(null);
          try {
            this.dialogRef.close(await firstValueFrom(this.save(field().value())));
          } catch (error) {
            this.serverError.set(
              errorMessage(error, {
                400: 'Datos no válidos o alias reservado.',
                404: 'Esta URL ya no existe.',
                409: 'Ese alias ya está en uso.',
              }),
            );
          }
          return undefined;
        },
      },
    },
  );

  private save({ url, alias, expiresAt }: UrlFormModel) {
    const current = this.url;
    if (current) {
      return this.urls.update(current.id, { url, expiresAt: expiresAt?.toISOString() ?? null });
    }
    return this.urls.create({
      url,
      ...(alias ? { alias } : {}),
      ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
    });
  }
}
