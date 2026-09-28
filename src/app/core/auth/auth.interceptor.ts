import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { AuthService } from './auth.service';

/** Cookie-based endpoints: no bearer token and no refresh-and-retry. */
const COOKIE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(API_BASE_URL);
  if (!req.url.startsWith(`${apiUrl}/api/`)) {
    return next(req);
  }
  if (COOKIE_ENDPOINTS.some((path) => req.url === `${apiUrl}${path}`)) {
    return next(req.clone({ withCredentials: true }));
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const sentToken = auth.accessToken();

  return next(withBearer(req, sentToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      // Another request already refreshed the token while this one was in flight.
      const currentToken = auth.accessToken();
      if (currentToken && currentToken !== sentToken) {
        return next(withBearer(req, currentToken));
      }
      return auth.refresh().pipe(
        catchError(() => {
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => error);
        }),
        switchMap(({ accessToken }) => next(withBearer(req, accessToken))),
      );
    }),
  );
};

function withBearer<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}
