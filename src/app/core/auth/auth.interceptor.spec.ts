import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthResponse } from '../api.models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const API = 'http://localhost:3000';

function authResponse(accessToken: string): AuthResponse {
  return {
    accessToken,
    expiresIn: 900,
    user: {
      id: 'u1',
      email: 'demo@example.com',
      name: 'Demo',
      role: 'user',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  };
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  function logIn(token: string): void {
    auth.login({ email: 'demo@example.com', password: 'secret' }).subscribe();
    backend.expectOne(`${API}/api/auth/login`).flush(authResponse(token));
  }

  it('adds the bearer token to API requests', () => {
    logIn('token-1');
    http.get(`${API}/api/urls`).subscribe();

    const req = backend.expectOne(`${API}/api/urls`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush({});
  });

  it('sends cookie endpoints with credentials and without a bearer token', () => {
    logIn('token-1');
    auth.refresh().subscribe();

    const req = backend.expectOne(`${API}/api/auth/refresh`);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(authResponse('token-2'));
  });

  it('leaves requests to other origins untouched', () => {
    logIn('token-1');
    http.get('https://example.com/data').subscribe();

    const req = backend.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('refreshes once and retries when the access token expired', () => {
    logIn('token-1');
    const result = vi.fn();
    http.get(`${API}/api/urls`).subscribe(result);

    backend.expectOne(`${API}/api/urls`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${API}/api/auth/refresh`).flush(authResponse('token-2'));

    const retry = backend.expectOne(`${API}/api/urls`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-2');
    retry.flush({ ok: true });
    expect(result).toHaveBeenCalledWith({ ok: true });
  });

  it('shares a single refresh between concurrent 401 responses', () => {
    logIn('token-1');
    http.get(`${API}/api/urls`).subscribe();
    http.get(`${API}/api/analytics/overview`).subscribe();

    backend.expectOne(`${API}/api/urls`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne(`${API}/api/analytics/overview`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    backend.expectOne(`${API}/api/auth/refresh`).flush(authResponse('token-2'));
    backend.expectOne(`${API}/api/urls`).flush({});
    backend.expectOne(`${API}/api/analytics/overview`).flush({});
  });

  it('retries without refreshing when another request already renewed the token', () => {
    logIn('token-1');
    http.get(`${API}/api/urls`).subscribe();
    const stale = backend.expectOne(`${API}/api/urls`);

    auth.refresh().subscribe();
    backend.expectOne(`${API}/api/auth/refresh`).flush(authResponse('token-2'));

    stale.flush(null, { status: 401, statusText: 'Unauthorized' });
    const retry = backend.expectOne(`${API}/api/urls`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer token-2');
    retry.flush({});
  });

  it('clears the session and goes to login when the refresh fails', () => {
    logIn('token-1');
    const error = vi.fn();
    http.get(`${API}/api/urls`).subscribe({ error });

    backend.expectOne(`${API}/api/urls`).flush(null, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne(`${API}/api/auth/refresh`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(error).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
