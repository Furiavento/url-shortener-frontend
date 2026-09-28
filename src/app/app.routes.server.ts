import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  // Everything else needs the in-memory access token, which only exists in the browser.
  { path: '**', renderMode: RenderMode.Client },
];
