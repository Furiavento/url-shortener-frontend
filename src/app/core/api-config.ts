import { InjectionToken } from '@angular/core';

/** Origin of the URL Shortener API (without the `/api` prefix). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => 'http://localhost:3000',
});
