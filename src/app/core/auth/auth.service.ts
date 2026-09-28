import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, Service, computed, inject, signal } from '@angular/core';
import { Observable, finalize, firstValueFrom, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { AuthResponse, LoginRequest, PublicUser, RegisterRequest } from '../api.models';

interface Session {
  accessToken: string;
  user: PublicUser;
}

/**
 * Holds the access token in memory. The refresh token lives in an httpOnly cookie
 * scoped to `/api/auth`, so every auth call is sent with credentials.
 */
@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${inject(API_BASE_URL)}/api/auth`;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly session = signal<Session | null>(null);
  readonly user = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  private refreshInFlight: Observable<AuthResponse> | null = null;
  private restoring: Promise<boolean> | null = null;

  login(body: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${this.authUrl}/login`, body, { withCredentials: true })
      .pipe(tap((response) => this.setSession(response)));
  }

  register(body: RegisterRequest) {
    return this.http
      .post<AuthResponse>(`${this.authUrl}/register`, body, { withCredentials: true })
      .pipe(tap((response) => this.setSession(response)));
  }

  logout() {
    return this.http
      .post<void>(`${this.authUrl}/logout`, null, { withCredentials: true })
      .pipe(finalize(() => this.clearSession()));
  }

  /**
   * Rotates the refresh cookie. Concurrent callers share one request: sending an
   * already-rotated cookie makes the API revoke the whole session.
   */
  refresh(): Observable<AuthResponse> {
    this.refreshInFlight ??= this.http
      .post<AuthResponse>(`${this.authUrl}/refresh`, null, { withCredentials: true })
      .pipe(
        tap({
          next: (response) => this.setSession(response),
          error: () => this.clearSession(),
        }),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    return this.refreshInFlight;
  }

  /** Recovers the session from the refresh cookie after a page load. Only tried once. */
  restoreSession(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return Promise.resolve(true);
    }
    if (!this.isBrowser) {
      return Promise.resolve(false);
    }
    this.restoring ??= firstValueFrom(this.refresh()).then(
      () => true,
      () => false,
    );
    return this.restoring;
  }

  clearSession(): void {
    this.session.set(null);
    this.restoring = Promise.resolve(false);
  }

  private setSession({ accessToken, user }: AuthResponse): void {
    this.session.set({ accessToken, user });
  }
}
