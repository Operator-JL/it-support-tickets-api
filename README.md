# SIST - Sistema Interno de Soporte Tecnico

Sistema interno para crear, revisar y dar seguimiento a tickets de soporte tecnico.

## Tecnologias

- Node.js
- Express
- SQL Server
- React/Vite
- JWT
- bcrypt
- Google OAuth/OIDC
- Socket.IO
- Resend para notificaciones opcionales por correo

## Configuracion

Backend: copiar `.env.example` a `.env` y configurar:

```env
PORT=3000
DB_USER=
DB_PASSWORD=
DB_SERVER=
DB_DATABASE=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_ALLOWED_DOMAIN=
FRONTEND_URL=http://localhost:5173
EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_TO=
```

Frontend: copiar `frontend/.env.example` a `frontend/.env` si se necesita cambiar la URL del API o activar Google:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=
```

`GOOGLE_CLIENT_ID` y `VITE_GOOGLE_CLIENT_ID` deben usar el mismo client id de Google. Si no se configuran, el login local sigue funcionando y Google queda oculto/deshabilitado.

`EMAIL_TO` acepta un correo o varios separados por coma. Las notificaciones por Resend son opcionales y best-effort: si `EMAIL_ENABLED=false` o faltan datos de correo, los tickets siguen funcionando.

## Base de datos y datos demo

El script oficial esta en `database.sql`.

Ese script crea o actualiza:

- `Users`
- `Tickets`
- `TicketComments`

Ejecutalo en SQL Server Management Studio o con `sqlcmd` antes de levantar el backend. La base esperada es `ITSupportTicketsDB`; en `.env`, `DB_SERVER` puede ser `localhost` o una instancia como `localhost\SQLEXPRESS`.

Tambien deja estos usuarios demo:

- `admin@sist.local` / `Admin123!` / `admin`
- `soporte@sist.local` / `Soporte123!` / `soporte`
- `usuario@sist.local` / `Usuario123!` / `usuario`

`Users.is_active` indica si la cuenta esta habilitada. `Users.is_online` se usa para presencia en Socket.IO.

Si una base antigua no tiene presencia, `database.sql` agrega la columna de forma idempotente:

```sql
IF COL_LENGTH('dbo.Users', 'is_online') IS NULL
BEGIN
  ALTER TABLE dbo.Users
  ADD is_online BIT NOT NULL
  CONSTRAINT DF_Users_is_online DEFAULT (0) WITH VALUES;
END;
```

Al iniciar el backend, la presencia se reinicia a desconectado (`is_online = 0`). Presencia nunca debe cambiar `is_active`.

## Correr backend

```powershell
cd C:\Users\jlozo\Desktop\JL-it-support-tickets-api
npm install
npm run dev
```

## Correr frontend

```powershell
cd C:\Users\jlozo\Desktop\JL-it-support-tickets-api\frontend
npm install
npm run dev
```

Backend: [http://localhost:3000](http://localhost:3000/)

Frontend: [http://localhost:5173](http://localhost:5173/)

## Rutas principales

- `GET /`
- `POST /register`
- `POST /login`
- `POST /auth/google`
- `POST /logout`
- `GET /profile`
- `GET /tickets`
- `POST /tickets`
- `GET /tickets/my`
- `GET /tickets/:id`
- `PUT /tickets/:id`
- `PATCH /tickets/:id/status`
- `DELETE /tickets/:id`
- `GET /tickets/:ticketId/comments`
- `POST /tickets/:ticketId/comments`
- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `PATCH /users/:id/status`
- `PATCH /users/:id/password`
- `PATCH /users/:id/role`

## Permisos

- `usuario`: puede crear tickets, ver sus propios tickets y comentar tickets a los que tiene acceso.
- `soporte`: puede ver todos los tickets, actualizar tickets, cambiar estados y comentar.
- `admin`: puede hacer lo mismo que soporte, ademas administra usuarios y elimina tickets.
- El backend valida permisos aunque el frontend oculte opciones.
- No se permite desactivar el admin actual ni quitar/desactivar el ultimo admin activo.

## Seguridad

- JWT se usa como sesion interna del sistema.
- bcrypt protege las contrasenas locales.
- Los roles `admin`, `soporte` y `usuario` controlan permisos.
- Google valida la identidad externa con OIDC, pero SIST genera su propio JWT interno.
- Los usuarios Google no guardan contrasena local.
- Socket.IO recibe el JWT en `socket.auth.token` y valida el token antes de registrar presencia.
- `GOOGLE_ALLOWED_DOMAIN` es opcional y restringe cuentas Google por dominio `hd`.
- Los usuarios Google se guardan con `provider='google'` y `google_id`.
- Eventos Socket.IO: `ticket:created`, `ticket:updated`, `ticket:status-updated`, `ticket:deleted`, `comment:created`.

## Troubleshooting

- Si `3000` esta ocupado, cambia `PORT` en backend y actualiza `VITE_API_URL` en frontend.
- Si Vite usa otro puerto distinto a `5173`, actualiza `FRONTEND_URL` para CORS y Socket.IO.
- Si falta `JWT_SECRET`, el backend no debe arrancar.
- Si Google no esta configurado, el login local funciona y el boton de Google queda oculto.

## Checklist demo

1. Levantar SQL Server y ejecutar `database.sql`.
2. Levantar backend con `npm run dev`.
3. Levantar frontend con `npm run dev` dentro de `frontend`.
4. Entrar como admin y mostrar panel, tickets, usuarios y reportes.
5. Crear usuario, cambiar rol, desactivar, probar login bloqueado y reactivar.
6. Entrar como soporte y confirmar que no administra usuarios.
7. Crear ticket, cambiar estado a `En proceso` y `Cerrado`.
8. Mostrar reportes y explicar que salen de tickets reales.
9. Explicar JWT, bcrypt, roles, OAuth y presencia online/offline.

## Pruebas manuales sugeridas

```powershell
$BaseUrl = "http://localhost:3000"

$AdminLogin = Invoke-RestMethod -Method Post -Uri "$BaseUrl/login" -ContentType "application/json" -Body (@{ email="admin@sist.local"; password="Admin123!" } | ConvertTo-Json)
$AdminToken = $AdminLogin.token

$UserLogin = Invoke-RestMethod -Method Post -Uri "$BaseUrl/login" -ContentType "application/json" -Body (@{ email="usuario@sist.local"; password="Usuario123!" } | ConvertTo-Json)
$UserToken = $UserLogin.token

Invoke-WebRequest -Method Post -Uri "$BaseUrl/login" -ContentType "application/json" -Body (@{ correo="admin@sist.local"; password="Admin123!" } | ConvertTo-Json) -UseBasicParsing
Invoke-WebRequest -Method Post -Uri "$BaseUrl/login" -ContentType "application/json" -Body (@{ email="admin@sist.local"; password="bad-password" } | ConvertTo-Json) -UseBasicParsing
Invoke-WebRequest -Method Get -Uri "$BaseUrl/profile" -Headers @{ Authorization="Bearer $AdminToken" } -UseBasicParsing
Invoke-WebRequest -Method Get -Uri "$BaseUrl/users" -Headers @{ Authorization="Bearer $AdminToken" } -UseBasicParsing
Invoke-WebRequest -Method Get -Uri "$BaseUrl/users" -UseBasicParsing
Invoke-WebRequest -Method Get -Uri "$BaseUrl/users" -Headers @{ Authorization="Bearer $UserToken" } -UseBasicParsing
```
