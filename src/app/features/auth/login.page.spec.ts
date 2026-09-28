import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginPage } from './login.page';

const API = 'http://localhost:3000';

describe('LoginPage', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  async function render() {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const type = async (selector: string, value: string) => {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const submit = async () => {
      element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    };
    return { fixture, element, type, submit };
  }

  it('shows validation errors and does not call the API when empty', async () => {
    const { element, submit } = await render();
    await submit();

    expect(element.textContent).toContain('Introduce tu email.');
    expect(element.textContent).toContain('Introduce tu contraseña.');
    backend.expectNone(`${API}/api/auth/login`);
  });

  it('logs in with the values typed in the PrimeNG inputs', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { type, submit } = await render();
    await type('#email', 'demo@example.com');
    await type('#password', 'supersecret');
    await submit();

    const req = backend.expectOne(`${API}/api/auth/login`);
    expect(req.request.body).toEqual({ email: 'demo@example.com', password: 'supersecret' });
    req.flush({
      accessToken: 't',
      expiresIn: 900,
      user: {
        id: '1',
        email: 'demo@example.com',
        name: 'Demo',
        role: 'user',
        createdAt: '',
        updatedAt: '',
      },
    });
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/'));
  });

  it('shows the API error for wrong credentials', async () => {
    const { element, type, submit, fixture } = await render();
    await type('#email', 'demo@example.com');
    await type('#password', 'wrong');
    await submit();

    backend.expectOne(`${API}/api/auth/login`).flush(null, { status: 401, statusText: '' });
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.textContent).toContain('Email o contraseña incorrectos.');
    });
  });
});
