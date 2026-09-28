import { HttpErrorResponse } from '@angular/common/http';

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'No se pudo conectar con el servidor.',
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión ha expirado. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso no existe.',
  409: 'El recurso ya existe.',
  429: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
};

/**
 * Turns an HTTP error into a user-facing message. `overrides` lets each call site
 * give meaning to the statuses its endpoint documents (e.g. 409 on an alias).
 */
export function errorMessage(error: unknown, overrides: Record<number, string> = {}): string {
  if (error instanceof HttpErrorResponse) {
    const message = overrides[error.status] ?? DEFAULT_MESSAGES[error.status];
    if (message) {
      return message;
    }
    if (error.status >= 500) {
      return 'El servidor no está disponible. Inténtalo más tarde.';
    }
  }
  return 'Ha ocurrido un error inesperado.';
}
