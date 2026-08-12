# Proyecto Imagina server

Backend Node/Express independiente del frontend. PostgreSQL es la base de datos objetivo y Prisma mantiene el esquema y las migraciones.

## Desarrollo local

1. Copiar `.env.example` a `.env` y ajustar `DATABASE_URL`, `JWT_ACCESS_SECRET` y los orígenes CORS.
2. Crear una base PostgreSQL vacía.
3. Ejecutar `npm run db:migrate`.
4. Ejecutar `npm run db:seed`.
5. Configurar las cuatro variables `BOOTSTRAP_ADMIN_*` y ejecutar una única vez `npm run admin:bootstrap`.
6. Iniciar con `npm run server:dev`.

El seed crea permisos y roles de forma idempotente, pero no crea usuarios ni contraseñas. El bootstrap falla si ya existe un SUPERADMIN activo y nunca escribe la contraseña en logs.

No se incluye `tenantId`: el proyecto no tiene actualmente un requisito multiempresa. Incorporarlo prematuramente ampliaría todas las restricciones y consultas sin aportar aislamiento que hoy se utilice.

El hashing usa bcrypt por compatibilidad reproducible con Windows y VPS. Argon2id sigue siendo la evolución recomendada cuando la cadena de despliegue garantice sus binarios nativos.

## Autenticación

- `GET /health`: comprobación pública.
- `POST /auth/login`: recibe `{ "usernameOrEmail": "...", "password": "..." }`.
- `POST /auth/refresh`: rota la cookie de refresh.
- `POST /auth/logout`: revoca la sesión y limpia la cookie.
- `GET /auth/me`: requiere `Authorization: Bearer <accessToken>`.

El access token dura `JWT_ACCESS_TTL` y debe conservarse en memoria en el futuro cliente React. El refresh token es aleatorio, se guarda como SHA-256 en PostgreSQL y se entrega al navegador únicamente en cookie `HttpOnly`, `SameSite=Strict`, `Secure` en producción y limitada a `/auth`.

La protección CSRF inicial combina `SameSite=Strict` y CORS con lista explícita. Si posteriormente Web y API operan en sitios diferentes, deberá añadirse un token CSRF explícito antes de relajar `SameSite`.

`JWT_ACCESS_SECRET` debe ser aleatorio, criptográficamente fuerte y tener al menos 32 caracteres. No debe almacenarse en Git.

Respuesta de login y refresh:

```json
{
  "user": { "id": "...", "username": "...", "email": "...", "displayName": "...", "status": "ACTIVE" },
  "roles": ["..."],
  "permissions": ["..."],
  "accessToken": "...",
  "expiresIn": 900
}
```

Los permisos no se incluyen en el JWT; se vuelven a resolver desde PostgreSQL al autenticar cada solicitud. Electron reutilizará los mismos servicios de sesión con otro adaptador de transporte en una fase posterior; no se emiten Offline Grants todavía.
