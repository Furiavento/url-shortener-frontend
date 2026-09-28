import { InjectionToken } from '@angular/core';

/** Injected at build time with `ng build --define` (see Dockerfile). */
declare const NG_API_BASE_URL: string | undefined;

/** Origin of the URL Shortener API (without the `/api` prefix). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () =>
    typeof NG_API_BASE_URL !== 'undefined' ? NG_API_BASE_URL : 'http://localhost:3000',
});
