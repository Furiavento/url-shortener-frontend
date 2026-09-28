import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const API = 'http://localhost:3000';
const USER = {
  id: 'u1',
  email: 'demo@example.com',
  name: 'Demo',
  role: 'user' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AuthService', () => {
  function setup(platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return {
      auth: TestBed.inject(AuthService),
      backend: TestBed.inject(HttpTestingController),
    };
  }

  it('restores the session from the refresh cookie only once', async () => {
    const { auth, backend } = setup();
    const first = auth.restoreSession();
    const second = auth.restoreSession();

    backend
      .expectOne(`${API}/api/auth/refresh`)
      .flush({ accessToken: 'token-1', expiresIn: 900, user: USER });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(auth.user()?.name).toBe('Demo');
    backend.verify();
  });

  it('reports no session when the refresh cookie is rejected', async () => {
    const { auth, backend } = setup();
    const restored = auth.restoreSession();

    backend.expectOne(`${API}/api/auth/refresh`).flush(null, { status: 401, statusText: '' });

    expect(await restored).toBe(false);
    expect(await auth.restoreSession()).toBe(false);
    backend.verify();
  });

  it('does not call the API while rendering on the server', async () => {
    const { auth, backend } = setup('server');
    expect(await auth.restoreSession()).toBe(false);
    backend.verify();
  });

  it('clears the session on logout even if the request fails', () => {
    const { auth, backend } = setup();
    auth.login({ email: USER.email, password: 'secret' }).subscribe();
    backend
      .expectOne(`${API}/api/auth/login`)
      .flush({ accessToken: 'token-1', expiresIn: 900, user: USER });
    expect(auth.isAuthenticated()).toBe(true);

    auth.logout().subscribe({ error: () => undefined });
    backend.expectOne(`${API}/api/auth/logout`).flush(null, { status: 500, statusText: '' });

    expect(auth.isAuthenticated()).toBe(false);
    backend.verify();
  });
});
