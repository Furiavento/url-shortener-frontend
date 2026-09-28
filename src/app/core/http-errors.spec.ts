import { HttpErrorResponse } from '@angular/common/http';
import { errorMessage } from './http-errors';

describe('errorMessage', () => {
  const httpError = (status: number) => new HttpErrorResponse({ status });

  it('uses the override for the status when given', () => {
    expect(errorMessage(httpError(409), { 409: 'Ese alias ya está en uso.' })).toBe(
      'Ese alias ya está en uso.',
    );
  });

  it('falls back to the default message for known statuses', () => {
    expect(errorMessage(httpError(429))).toContain('Demasiados intentos');
    expect(errorMessage(httpError(0))).toContain('No se pudo conectar');
  });

  it('reports server errors generically', () => {
    expect(errorMessage(httpError(503))).toContain('servidor no está disponible');
  });

  it('handles errors that are not HTTP errors', () => {
    expect(errorMessage(new Error('boom'))).toBe('Ha ocurrido un error inesperado.');
  });
});
