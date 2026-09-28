import { Component, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  email,
  form,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http-errors';
import { FieldErrors } from '../../shared/field-errors';

@Component({
  selector: 'app-register-page',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    FieldErrors,
  ],
  template: `
    <main class="flex min-h-screen items-center justify-center p-4">
      <div class="w-full max-w-md rounded-xl bg-surface-0 p-8 shadow-sm">
        <h1 class="mb-6 text-2xl font-semibold">Crear cuenta</h1>

        <form [formRoot]="registerForm" class="flex flex-col gap-5">
          @if (serverError(); as serverError) {
            <p-message severity="error">{{ serverError }}</p-message>
          }

          <div class="flex flex-col gap-2">
            <label for="name" class="font-medium">Nombre</label>
            <input
              pInputText
              id="name"
              autocomplete="name"
              aria-describedby="name-error"
              [formField]="registerForm.name"
            />
            <app-field-errors id="name-error" [state]="registerForm.name()" />
          </div>

          <div class="flex flex-col gap-2">
            <label for="email" class="font-medium">Email</label>
            <input
              pInputText
              id="email"
              type="email"
              autocomplete="email"
              aria-describedby="email-error"
              [formField]="registerForm.email"
            />
            <app-field-errors id="email-error" [state]="registerForm.email()" />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="font-medium">Contraseña</label>
            <p-password
              inputId="password"
              autocomplete="new-password"
              [feedback]="false"
              [toggleMask]="true"
              [fluid]="true"
              [formField]="registerForm.password"
            />
            <small class="text-surface-700">Entre 8 y 72 caracteres.</small>
            <app-field-errors [state]="registerForm.password()" />
          </div>

          <p-button
            type="submit"
            label="Crear cuenta"
            [loading]="registerForm().submitting()"
            [fluid]="true"
          />
        </form>

        <p class="mt-6 text-sm text-surface-700">
          ¿Ya tienes cuenta?
          <a routerLink="/login" class="font-medium text-primary-700 underline">Inicia sesión</a>
        </p>
      </div>
    </main>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly serverError = signal<string | null>(null);
  protected readonly registerForm = form(
    signal({ name: '', email: '', password: '' }),
    (path) => {
      required(path.name, { message: 'Introduce tu nombre.' });
      maxLength(path.name, 100, { message: 'Máximo 100 caracteres.' });
      required(path.email, { message: 'Introduce tu email.' });
      email(path.email, { message: 'Introduce un email válido.' });
      maxLength(path.email, 255, { message: 'Máximo 255 caracteres.' });
      required(path.password, { message: 'Introduce una contraseña.' });
      minLength(path.password, 8, { message: 'Mínimo 8 caracteres.' });
      maxLength(path.password, 72, { message: 'Máximo 72 caracteres.' });
    },
    {
      submission: {
        action: async (field) => {
          this.serverError.set(null);
          try {
            await firstValueFrom(this.auth.register(field().value()));
            await this.router.navigateByUrl('/');
          } catch (error) {
            this.serverError.set(
              errorMessage(error, { 409: 'Ya existe una cuenta con ese email.' }),
            );
          }
          return undefined;
        },
      },
    },
  );
}
