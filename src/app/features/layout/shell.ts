import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SignOut } from '@primeicons/angular/sign-out';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    SignOut,
  ],
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-0 focus:p-2"
    >
      Saltar al contenido
    </a>

    <header class="border-b border-surface-200 bg-surface-0">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <a routerLink="/" class="text-lg font-semibold text-surface-900">Acortador</a>

        <nav aria-label="Principal" class="flex gap-1">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="bg-primary-50 text-primary-800"
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: link.exact }"
              class="rounded-md px-3 py-2 font-medium text-surface-700 hover:bg-surface-100"
            >
              {{ link.label }}
            </a>
          }
        </nav>

        <div class="ml-auto flex items-center gap-3">
          <span class="text-sm text-surface-700">{{ auth.user()?.name }}</span>
          <button pButton type="button" [text]="true" severity="secondary" (click)="logout()">
            <svg data-p-icon="sign-out" aria-hidden="true" [size]="16"></svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>

    <main id="main" tabindex="-1" class="mx-auto max-w-6xl px-4 py-8 outline-none">
      <router-outlet />
    </main>

    <p-toast />
    <p-confirmdialog />
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly links = [
    { path: '/', label: 'Dashboard', exact: true },
    { path: '/urls', label: 'Mis URLs', exact: false },
  ];

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
