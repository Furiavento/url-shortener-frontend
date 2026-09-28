import { Component, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, email, form, maxLength, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http-errors';
import { FieldErrors } from '../../shared/field-errors';
import { safeReturnUrl } from '../../shared/safe-return-url';

@Component({
  selector: 'app-login-page',
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
        <h1 class="mb-6 text-2xl font-semibold">Iniciar sesión</h1>

        <form [formRoot]="loginForm" class="flex flex-col gap-5">
          @if (serverError(); as serverError) {
            <p-message severity="error">{{ serverError }}</p-message>
          }

          <div class="flex flex-col gap-2">
            <label for="email" class="font-medium">Email</label>
            <input
              pInputText
              id="email"
              type="email"
              autocomplete="email"
              aria-describedby="email-error"
              [formField]="loginForm.email"
            />
            <app-field-errors id="email-error" [state]="loginForm.email()" />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="font-medium">Contraseña</label>
            <p-password
              inputId="password"
              autocomplete="current-password"
              [feedback]="false"
              [toggleMask]="true"
              [fluid]="true"
              [formField]="loginForm.password"
            />
            <app-field-errors [state]="loginForm.password()" />
          </div>

          <p-button
            type="submit"
            label="Entrar"
            [loading]="loginForm().submitting()"
            [fluid]="true"
          />
        </form>

        <p class="mt-6 text-sm text-surface-700">
          ¿No tienes cuenta?
          <a routerLink="/register" class="font-medium text-primary-700 underline">Regístrate</a>
        </p>
      </div>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly serverError = signal<string | null>(null);
  protected readonly loginForm = form(
    signal({ email: '', password: '' }),
    (path) => {
      required(path.email, { message: 'Introduce tu email.' });
      email(path.email, { message: 'Introduce un email válido.' });
      required(path.password, { message: 'Introduce tu contraseña.' });
      maxLength(path.password, 72, { message: 'Máximo 72 caracteres.' });
    },
    {
      submission: {
        action: async (field) => {
          this.serverError.set(null);
          try {
            await firstValueFrom(this.auth.login(field().value()));
            await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
          } catch (error) {
            this.serverError.set(errorMessage(error, { 401: 'Email o contraseña incorrectos.' }));
          }
          return undefined;
        },
      },
    },
  );
}
