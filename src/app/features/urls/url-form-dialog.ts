import { Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { FormField, FormRoot, form, maxLength, required, validate } from '@angular/forms/signals';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';
import { ShortUrl } from '../../core/api.models';
import { errorMessage } from '../../core/http-errors';
import { UrlsService } from '../../core/urls.service';
import { FieldErrors } from '../../shared/field-errors';

interface UrlFormModel {
  url: string;
  alias: string;
  expiresAt: Date | null;
}

const HTTP_URL = /^https?:\/\/\S+$/i;
const ALIAS = /^[A-Za-z0-9_-]{3,16}$/;

/** Creates a short URL, or edits the destination and expiration of `url` when given. */
@Component({
  selector: 'app-url-form-dialog',
  imports: [
    FormRoot,
    FormField,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    FieldErrors,
  ],
  template: `
    <p-dialog
      [header]="url() ? 'Editar URL' : 'Nueva URL'"
      [modal]="true"
      [draggable]="false"
      [(visible)]="visible"
      styleClass="w-full max-w-lg"
    >
      <form [formRoot]="urlForm" class="flex flex-col gap-5">
        @if (serverError(); as serverError) {
          <p-message severity="error">{{ serverError }}</p-message>
        }

        <div class="flex flex-col gap-2">
          <label for="url-destination" class="font-medium">URL de destino</label>
          <input
            pInputText
            id="url-destination"
            type="url"
            placeholder="https://ejemplo.com/pagina"
            aria-describedby="url-destination-error"
            [formField]="urlForm.url"
          />
          <app-field-errors id="url-destination-error" [state]="urlForm.url()" />
        </div>

        @if (url(); as current) {
          <p class="text-sm text-surface-700">
            Código: <strong>{{ current.code }}</strong> (no se puede cambiar)
          </p>
        } @else {
          <div class="flex flex-col gap-2">
            <label for="url-alias" class="font-medium">Alias personalizado (opcional)</label>
            <input
              pInputText
              id="url-alias"
              aria-describedby="url-alias-hint url-alias-error"
              [formField]="urlForm.alias"
            />
            <small id="url-alias-hint" class="text-surface-700">
              De 3 a 16 letras, números, guiones o guiones bajos. Si lo dejas vacío se genera uno.
            </small>
            <app-field-errors id="url-alias-error" [state]="urlForm.alias()" />
          </div>
        }

        <div class="flex flex-col gap-2">
          <label for="url-expires" class="font-medium">Expira (opcional)</label>
          <p-datepicker
            inputId="url-expires"
            [showTime]="true"
            hourFormat="24"
            [showIcon]="true"
            [showClear]="true"
            [minDate]="minDate()"
            dateFormat="dd/mm/yy"
            [fluid]="true"
            [formField]="urlForm.expiresAt"
          />
          <app-field-errors [state]="urlForm.expiresAt()" />
        </div>

        <div class="flex justify-end gap-2">
          <p-button
            label="Cancelar"
            severity="secondary"
            [text]="true"
            (onClick)="visible.set(false)"
          />
          <p-button
            type="submit"
            [label]="url() ? 'Guardar' : 'Crear'"
            [loading]="urlForm().submitting()"
          />
        </div>
      </form>
    </p-dialog>
  `,
})
export class UrlFormDialog {
  private readonly urls = inject(UrlsService);

  readonly visible = model(false);
  /** The URL being edited; `null` to create a new one. */
  readonly url = input<ShortUrl | null>(null);
  readonly saved = output<ShortUrl>();

  protected readonly serverError = signal<string | null>(null);
  protected readonly minDate = computed(() => (this.visible() ? new Date() : null));

  protected readonly urlForm = form(
    signal<UrlFormModel>({ url: '', alias: '', expiresAt: null }),
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
            const saved = await firstValueFrom(this.save(field().value()));
            this.saved.emit(saved);
            this.visible.set(false);
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

  constructor() {
    // Load the edited URL (or a blank form) every time the dialog opens.
    effect(() => {
      if (!this.visible()) {
        return;
      }
      const current = this.url();
      this.serverError.set(null);
      this.urlForm().reset({
        url: current?.originalUrl ?? '',
        alias: '',
        expiresAt: current?.expiresAt ? new Date(current.expiresAt) : null,
      });
    });
  }

  private save({ url, alias, expiresAt }: UrlFormModel) {
    const current = this.url();
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
