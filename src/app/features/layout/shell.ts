import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButton, MatIcon, MatToolbar],
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface focus:p-2"
    >
      Saltar al contenido
    </a>

    <header class="border-b border-outline-variant">
      <mat-toolbar class="app-toolbar">
        <div class="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 py-2">
          <a routerLink="/" class="text-lg font-medium text-on-surface no-underline">Acortador</a>

          <nav aria-label="Principal" class="flex gap-1">
            @for (link of links; track link.path) {
              <a
                [matButton]="active.isActive ? 'tonal' : 'text'"
                [routerLink]="link.path"
                routerLinkActive
                #active="routerLinkActive"
                ariaCurrentWhenActive="page"
                [routerLinkActiveOptions]="{ exact: link.exact }"
              >
                {{ link.label }}
              </a>
            }
          </nav>

          <div class="ml-auto flex items-center gap-3">
            <span class="text-sm text-on-surface-variant">{{ auth.user()?.name }}</span>
            <button matButton type="button" (click)="logout()">
              <mat-icon aria-hidden="true">logout</mat-icon>
              Cerrar sesión
            </button>
          </div>
        </div>
      </mat-toolbar>
    </header>

    <main id="main" tabindex="-1" class="mx-auto max-w-6xl px-4 py-8 outline-none">
      <router-outlet />
    </main>
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
