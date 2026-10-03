import { Component, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, email, form, maxLength, required } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http-errors';
import { ErrorMessage } from '../../shared/error-message';
import { safeReturnUrl } from '../../shared/safe-return-url';

@Component({
  selector: 'app-login-page',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    MatButton,
    MatIconButton,
    MatCard,
    MatCardContent,
    MatError,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatIcon,
    MatInput,
    MatProgressSpinner,
    ErrorMessage,
  ],
  template: `
    <main class="flex min-h-screen items-center justify-center p-4">
      <mat-card appearance="outlined" class="w-full max-w-md">
        <mat-card-content class="!p-8">
          <h1 class="mb-6 text-2xl font-medium">Iniciar sesión</h1>

          <form [formRoot]="loginForm" class="flex flex-col gap-4">
            @if (serverError(); as serverError) {
              <app-error-message>{{ serverError }}</app-error-message>
            }

            <mat-form-field>
              <mat-label>Email</mat-label>
              <input
                matInput
                id="email"
                type="email"
                autocomplete="email"
                [formField]="loginForm.email"
              />
              <mat-error>{{ loginForm.email().errors()[0]?.message }}</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                id="password"
                autocomplete="current-password"
                [type]="showPassword() ? 'text' : 'password'"
                [formField]="loginForm.password"
              />
              <button
                matIconButton
                matSuffix
                type="button"
                aria-label="Mostrar contraseña"
                [attr.aria-pressed]="showPassword()"
                (click)="showPassword.set(!showPassword())"
              >
                <mat-icon aria-hidden="true">{{
                  showPassword() ? 'visibility_off' : 'visibility'
                }}</mat-icon>
              </button>
              <mat-error>{{ loginForm.password().errors()[0]?.message }}</mat-error>
            </mat-form-field>

            <button
              matButton="filled"
              type="submit"
              class="w-full"
              [disabled]="loginForm().submitting()"
              [showProgress]="loginForm().submitting()"
            >
              <mat-spinner progressIndicator diameter="20" aria-label="Entrando" />
              Entrar
            </button>
          </form>

          <p class="mt-6 text-sm text-on-surface-variant">
            ¿No tienes cuenta?
            <a routerLink="/register" class="font-medium text-primary underline">Regístrate</a>
          </p>
        </mat-card-content>
      </mat-card>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  protected readonly showPassword = signal(false);
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
