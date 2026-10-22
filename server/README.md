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

## Acabados especiales (fase 1)

Ejecutar `npm run db:migrate`, `npm run db:generate` y `npm run db:seed` antes de usar la API. `SPECIAL_FINISH_STORAGE_DIR` debe apuntar a un directorio privado y persistente, compartido por todas las instancias del servidor; si se omite en desarrollo se usa `server/storage/special-finishes`. Los archivos no se sirven como estáticos. Respaldar este directorio junto con PostgreSQL. El archivado conserva los archivos indefinidamente porque los proyectos JSON locales pueden referenciarlos.

- `GET /special-finishes?page=1&pageSize=20&search=nogal`: solo activos; `finishes.view`.
- `GET /special-finishes/:id`: detalle, incluso archivado; `finishes.view`.
- `POST /special-finishes`: JSON `{ "name": "...", "type": "RGB", "rgb": { "r": 0, "g": 0, "b": 0 } }` o `{ "name": "...", "type": "TEXTURE", "assetId": "uuid" }`; `finishes.create`.
- `POST /special-finishes/textures`: cuerpo binario PNG o JPEG, `Content-Type: image/png` o `image/jpeg`, `X-File-Name: nombre.png`; `finishes.create`. Máximo 5 MiB y 40 millones de píxeles. Se validan extensión, MIME y firma/dimensiones; la respuesta contiene un `assetId` para crear el acabado.
- `GET /special-finishes/textures/:id`: bytes protegidos por `finishes.view`.
- `DELETE /special-finishes/:id`: soft delete; `finishes.delete`. Responde 404 si no existe y 409 si ya estaba archivado.

Cada upload crea una versión inmutable. No hay sustitución ni purga automática; los uploads que nunca se vinculen a un acabado quedan retenidos para una futura política de limpieza. La API de esta fase no modifica materiales ni proyectos.
