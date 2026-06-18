# SIST - IT Support Tickets API

SIST es un sistema interno de tickets de soporte IT. El backend esta construido con Node.js, Express, SQL Server y JWT. El frontend esta construido con Vite, React y Tailwind CSS.

El proyecto esta pensado como demo escolar y de portafolio: simple, claro, funcional y facil de explicar.

## Tecnologias

### Backend

- Node.js
- Express
- SQL Server
- mssql
- JSON Web Token (JWT)
- bcrypt
- dotenv
- nodemon para desarrollo

### Frontend

- Vite
- React
- Tailwind CSS
- lucide-react

### Preparado para futuro

- Resend esta instalado/preparado, pero no esta integrado al flujo principal.
- Socket.IO esta instalado/preparado, pero no esta integrado al flujo principal.

## Estado actual

- Login con JWT.
- Registro de usuarios.
- Perfil autenticado.
- Dashboard con tickets reales.
- Navegacion lateral local en el frontend.
- Listado de tickets reales desde la API.
- Creacion de tickets reales.
- Detalle de ticket.
- Comentarios en tickets.
- Cambio de estado de tickets para `it` y `admin`.
- Eliminacion de tickets solo para `admin`.
- Pantalla de usuarios para `admin`.
- Cambio de rol de usuarios para `admin`.
- Reportes calculados con tickets reales.
- Pantalla de configuracion informativa.

## Estructura principal

```text
src/
  config/
    db.js
  controllers/
    authController.js
    ticketsController.js
    ticketCommentsController.js
    usersController.js
  middlewares/
    authMiddleware.js
    roleMiddleware.js
  routes/
    authRoutes.js
    ticketsRoutes.js
    ticketCommentsRoutes.js
    usersRoutes.js
  server.js

frontend/
  index.html
  vite.config.mjs
  package.json
  src/
    App.jsx
    main.jsx
    index.css
    assets/
    components/
    pages/
    services/
```

## Instalacion

Instala dependencias del backend desde la raiz:

```bash
npm install
```

Instala dependencias del frontend:

```bash
cd frontend
npm install
```

## Variables de entorno

No subas el `.env` real al repositorio. Usa `.env.example` y `frontend/.env.example` como referencia.

### Backend `.env`

```env
PORT=3000
DB_USER=
DB_PASSWORD=
DB_SERVER=
DB_DATABASE=
JWT_SECRET=
FRONTEND_URL=http://localhost:5173
```

Variables preparadas para una fase futura con Resend:

```env
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_TO=
EMAIL_ENABLED=false
```

### Frontend `frontend/.env`

```env
VITE_API_URL=http://localhost:3000
```

## Comandos

### Backend

Instalar dependencias:

```bash
npm install
```

Ejecutar en desarrollo:

```bash
npm run dev
```

URL local:

```text
http://localhost:3000
```

### Frontend

Instalar dependencias:

```bash
cd frontend && npm install
```

Ejecutar en desarrollo:

```bash
cd frontend && npm run dev
```

Generar build:

```bash
cd frontend && npm run build
```

URL local usual:

```text
http://localhost:5173
```

## Guia rapida para demo

Instala dependencias del backend:

```bash
npm install
```

Ejecuta el backend:

```bash
npm run dev
```

Instala dependencias del frontend:

```bash
cd frontend && npm install
```

Ejecuta el frontend:

```bash
cd frontend && npm run dev
```

Abre el frontend:

```text
http://localhost:5173
```

Inicia sesion con el usuario admin demo creado localmente.

Flujo sugerido para presentar:

1. Dashboard.
2. Tickets.
3. Crear ticket.
4. Ver detalle de ticket.
5. Agregar comentario.
6. Cambiar estado.
7. Usuarios.
8. Reportes.
9. Configuracion.

## Health check

```http
GET /
```

Respuesta esperada:

```json
{
  "status": 200,
  "message": "Server is running"
}
```

## Autenticacion

Las rutas protegidas requieren el token JWT en el header:

```http
Authorization: Bearer <token>
```

El token se obtiene con `POST /login`.

El token incluye:

- `id`
- `name`
- `email`
- `role`

## Roles

Roles disponibles:

- `user`
- `it`
- `admin`

Permisos principales:

- `user`: puede crear tickets, ver sus propios tickets, ver detalle de sus tickets y comentar en sus tickets.
- `it`: puede ver todos los tickets, editar tickets, cambiar estado y comentar.
- `admin`: puede hacer lo mismo que `it`, borrar tickets, ver usuarios y cambiar roles.

El registro publico crea usuarios con rol `user`. Para probar permisos de `it` o `admin`, cambia el rol desde SQL Server o desde la pantalla de Usuarios usando una cuenta admin.

## Rutas principales

### Auth

```http
GET /
POST /register
POST /login
GET /profile
```

`GET /profile` requiere autenticacion.

### Tickets

Todas las rutas de tickets requieren autenticacion.

```http
GET /tickets
GET /tickets/my
GET /tickets/:id
POST /tickets
PUT /tickets/:id
PATCH /tickets/:id/status
DELETE /tickets/:id
```

Notas:

- `GET /tickets` devuelve solo tickets propios para `user`.
- `GET /tickets` devuelve todos los tickets para `it` y `admin`.
- `PUT /tickets/:id` requiere rol `it` o `admin`.
- `PATCH /tickets/:id/status` requiere rol `it` o `admin`.
- `DELETE /tickets/:id` requiere rol `admin`.

### Comentarios

Las rutas de comentarios requieren autenticacion.

```http
POST /tickets/:ticketId/comments
GET /tickets/:ticketId/comments
```

### Usuarios

Las rutas de usuarios requieren autenticacion y rol `admin`.

```http
GET /users
PATCH /users/:id/role
```

`GET /users` no devuelve `PasswordHash`.

## Ejemplos JSON

### Registro

```http
POST /register
Content-Type: application/json
```

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "demo123"
}
```

### Login

```http
POST /login
Content-Type: application/json
```

```json
{
  "email": "demo@example.com",
  "password": "demo123"
}
```

### Crear ticket

```http
POST /tickets
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "title": "No puedo acceder al correo",
  "description": "El usuario no puede iniciar sesion en su cuenta de correo.",
  "category": "Correo",
  "priority": "Media"
}
```

Prioridades validas:

- `Baja`
- `Media`
- `Alta`
- `Urgente`

Si no se envia `priority`, se usa `Media`.

### Cambiar estado

```http
PATCH /tickets/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "status": "En proceso"
}
```

Estados validos:

- `Abierto`
- `En proceso`
- `Cerrado`

Cuando el estado cambia a `Cerrado`, se actualiza `closed_at`.

### Agregar comentario

```http
POST /tickets/:ticketId/comments
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "comment": "Se contacto al usuario y se esta revisando la cuenta."
}
```

### Cambiar rol de usuario

```http
PATCH /users/:id/role
Authorization: Bearer <admin-token>
Content-Type: application/json
```

```json
{
  "role": "it"
}
```

Roles validos:

- `user`
- `it`
- `admin`

Despues de cambiar un rol, el usuario debe iniciar sesion otra vez para obtener un JWT nuevo con el rol actualizado.

## Base de datos

Tablas principales:

- `Users`
- `Tickets`
- `TicketComments`

Columnas reales esperadas en `Users`:

- `id`
- `name`
- `email`
- `PasswordHash`
- `role`
- `is_active`
- `created_at`

El archivo `database.sql` contiene un script base para crear las tablas esperadas. No uses scripts destructivos como `DROP TABLE` o `DROP DATABASE` para la demo.

## Frontend

El frontend vive en `frontend/` y usa Vite + React + Tailwind CSS.

Pantallas actuales:

- Login
- Panel principal
- Tickets
- Usuarios
- Reportes
- Configuracion

La navegacion lateral se maneja localmente con React state, sin React Router.

## Notas de seguridad

- No subir `.env` real.
- Usar `.env.example` para variables del backend.
- Usar `frontend/.env.example` para variables del frontend.
- No devolver `PasswordHash` en respuestas de usuarios.
- Mantener rutas privadas protegidas con JWT.
- Mantener acciones admin protegidas por rol `admin`.

## Fases futuras

Resend y Socket.IO siguen instalados/preparados para una fase futura, pero no estan integrados al flujo principal.

Posibles mejoras futuras:

- Notificaciones por correo al crear o cerrar tickets.
- Notificaciones en tiempo real de tickets y comentarios.
- Filtros avanzados de tickets.
- Panel de configuracion persistente.
