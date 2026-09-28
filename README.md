# URL Shortener: frontend

Dashboard en Angular 22 + PrimeNG para la API de [url-shortener-backend](https://github.com/Furiavento/url-shortener-backend): registro e inicio de sesión, gestión de URLs cortas y estadísticas de clics.

## Puesta en marcha

Con el backend corriendo en `http://localhost:3000`:

```bash
npm install
npm start        # http://localhost:4200
```

En desarrollo la app llama a `http://localhost:3000`. El backend ya admite ese origen por CORS (`CORS_ORIGIN=http://localhost:4200`).

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo con recarga |
| `npm run build` | Build de producción con SSR. Prerenderiza `/login` y `/register` |
| `npm test` | Tests unitarios con Vitest |
| `npm run serve:ssr:url-shortener-frontend` | Sirve el build de producción con Node (puerto `4000`) |

## Estructura

- `src/app/core/`: configuración de la API, modelos del OpenAPI, servicios HTTP y autenticación (servicio, interceptor y guards).
- `src/app/features/`: páginas: login, registro, layout, dashboard, lista de URLs y detalle con estadísticas.
- `src/app/shared/`: componentes reutilizables (gráficos con tabla accesible, errores de formulario).

### Autenticación

- El access token vive solo en memoria.
- El refresh token es una cookie httpOnly que gestiona la API.
- Al cargar la app, la sesión se recupera con `POST /api/auth/refresh`.
- Si una petición devuelve 401, el interceptor renueva el token y la reintenta. Las peticiones concurrentes comparten una única renovación, porque reutilizar una cookie ya rotada revoca la sesión.

### Renderizado

- `/login` y `/register` se prerenderizan en el build.
- El resto de rutas se renderiza en el navegador, porque necesitan el token, que solo existe en memoria del cliente.

## Licencia de PrimeNG

PrimeNG 22 usa la PrimeUI License y pide una key; la licencia Community es gratuita para desarrolladores individuales. Pégala en `src/app/core/primeng-license.ts`. Sin key, la app funciona igual pero muestra un aviso de licencia.

## Producción

- La app se sirve en `app.furiavento.cloud`.
- La API y los links cortos van en `s.furiavento.cloud`.

Al compartir dominio, la cookie de refresh `SameSite=Strict` funciona entre los dos.

### Despliegue en Dokploy

1. Crea una **Application** desde este repositorio con build type **Dockerfile**.
2. En los **build args**, añade `API_BASE_URL=https://s.furiavento.cloud`. La URL queda fijada en el bundle, así que cambiarla requiere reconstruir la imagen; sin este argumento el build falla.
3. En las **variables de entorno**, añade `NG_ALLOWED_HOSTS=app.furiavento.cloud`. El servidor SSR de Angular responde `400 Bad Request` a cualquier host que no esté en esa lista.
4. En **Domains**, asigna `app.furiavento.cloud` al puerto `4000` con HTTPS (Let's Encrypt). El registro DNS `A` debe apuntar a la IP del VPS.

En el backend, `CORS_ORIGIN` debe ser `https://app.furiavento.cloud`.

### Probar la imagen en local

```bash
docker build --build-arg API_BASE_URL=http://localhost:3000 -t url-frontend .
docker run --rm -p 4000:4000 -e NG_ALLOWED_HOSTS=localhost url-frontend
```
