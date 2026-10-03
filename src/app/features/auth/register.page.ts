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
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/http-errors';
import { ErrorMessage } from '../../shared/error-message';

@Component({
  selector: 'app-register-page',
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
    MatHint,
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
          <h1 class="mb-6 text-2xl font-medium">Crear cuenta</h1>

          <form [formRoot]="registerForm" class="flex flex-col gap-4">
            @if (serverError(); as serverError) {
              <app-error-message>{{ serverError }}</app-error-message>
            }

            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput id="name" autocomplete="name" [formField]="registerForm.name" />
              <mat-error>{{ registerForm.name().errors()[0]?.message }}</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Email</mat-label>
              <input
                matInput
                id="email"
                type="email"
                autocomplete="email"
                [formField]="registerForm.email"
              />
              <mat-error>{{ registerForm.email().errors()[0]?.message }}</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                id="password"
                autocomplete="new-password"
                [type]="showPassword() ? 'text' : 'password'"
                [formField]="registerForm.password"
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
              <mat-hint>Entre 8 y 72 caracteres.</mat-hint>
              <mat-error>{{ registerForm.password().errors()[0]?.message }}</mat-error>
            </mat-form-field>

            <button
              matButton="filled"
              type="submit"
              class="w-full"
              [disabled]="registerForm().submitting()"
              [showProgress]="registerForm().submitting()"
            >
              <mat-spinner progressIndicator diameter="20" aria-label="Creando cuenta" />
              Crear cuenta
            </button>
          </form>

          <p class="mt-6 text-sm text-on-surface-variant">
            ¿Ya tienes cuenta?
            <a routerLink="/login" class="font-medium text-primary underline">Inicia sesión</a>
          </p>
        </mat-card-content>
      </mat-card>
    </main>
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
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
