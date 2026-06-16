# SIST - IT Support Tickets API

API REST para SIST: Sistema Interno de Soporte Tecnico. El proyecto esta construido con Node.js, Express, SQL Server y autenticacion JWT.

El backend permite registrar usuarios, iniciar sesion, consultar el perfil autenticado, crear tickets, administrar su estado y agregar comentarios con reglas basicas de roles y ownership.

## Tecnologias

- Node.js
- Express
- SQL Server
- mssql
- JSON Web Token (JWT)
- bcrypt
- dotenv
- nodemon para desarrollo
- React y Vite para el frontend
- Resend instalado para una fase futura
- Socket.IO instalado para una fase futura

## Estado actual

- Backend REST funcional.
- Autenticacion con JWT Bearer Token.
- Rutas privadas protegidas con middleware de autenticacion.
- Tickets con flujo basico: abierto, en proceso y cerrado.
- Comentarios asociados a tickets.
- Resend y Socket.IO estan instalados/preparados, pero todavia no estan integrados en el flujo principal.
- Frontend Vite/React separado en la carpeta `frontend/`.

## Estructura principal

```text
src/
  config/
    db.js
  controllers/
    authController.js
    ticketsController.js
    ticketCommentsController.js
  middlewares/
    authMiddleware.js
    roleMiddleware.js
  routes/
    authRoutes.js
    ticketsRoutes.js
    ticketCommentsRoutes.js
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
    data/
    pages/
```

## Instalacion

Instala las dependencias del backend desde la raiz del proyecto:

```bash
npm install
```

Crea un archivo `.env` basado en `.env.example` y configura las variables necesarias para tu entorno local.

Instala las dependencias del frontend desde la carpeta `frontend/`:

```bash
cd frontend
npm install
```

## Variables de entorno

Variables actuales esperadas:

```env
PORT=
DB_USER=
DB_PASSWORD=
DB_SERVER=
DB_DATABASE=
JWT_SECRET=
```

Variables preparadas para una fase futura con Resend:

```env
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_TO=
EMAIL_ENABLED=false
```

Los correos no estan activos todavia.

## Comandos

### Backend

Ejecutar el backend en modo normal desde la raiz:

```bash
npm start
```

Ejecutar el backend en modo desarrollo con nodemon desde la raiz:

```bash
npm run dev
```

Tambien se puede ejecutar directamente:

```bash
node src/server.js
```

URL local:

```text
http://localhost:3000
```

### Frontend

Ejecutar el frontend desde la carpeta `frontend/`:

```bash
cd frontend
npm run dev
```

Generar build del frontend:

```bash
cd frontend
npm run build
```

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

El token se obtiene al iniciar sesion con `POST /login`.

El token incluye datos basicos del usuario autenticado:

- `id`
- `name`
- `email`
- `role`

## Roles y permisos

Roles disponibles:

- `user`
- `it`
- `admin`

Reglas actuales:

- `user`: puede crear tickets, ver sus propios tickets, ver detalle de sus propios tickets y comentar en sus propios tickets.
- `it`: puede ver todos los tickets, actualizar tickets, cambiar estado y comentar en cualquier ticket.
- `admin`: tiene los mismos permisos que `it` y ademas puede borrar tickets.

El registro publico siempre crea usuarios con role `user`. Para una demo, un usuario puede convertirse manualmente a `it` o `admin` desde SQL Server.

## Endpoints reales

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
POST /tickets
GET /tickets
GET /tickets/my
GET /tickets/:id
PUT /tickets/:id
PATCH /tickets/:id/status
DELETE /tickets/:id
```

### Comentarios

Todas las rutas de comentarios requieren autenticacion.

```http
POST /tickets/:ticketId/comments
GET /tickets/:ticketId/comments
```

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

El usuario registrado queda con role `user` por defecto.

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

- Baja
- Media
- Alta
- Urgente

Si no se envia `priority`, se usa `Media` como valor por defecto.

### Cambiar estado del ticket

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

- Abierto
- En proceso
- Cerrado

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

## Base de datos

El archivo `database.sql` contiene un script base para crear las tablas esperadas por el proyecto en SQL Server:

- Users
- Tickets
- TicketComments

El script usa `IF OBJECT_ID(...) IS NULL` para evitar errores si las tablas ya existen.

Si tu tabla `Users` ya existia antes de agregar roles, puedes ejecutar el script completo o aplicar manualmente una migracion similar:

```sql
ALTER TABLE dbo.Users
ADD Role NVARCHAR(20) NOT NULL DEFAULT ('user') WITH VALUES;
```

Para preparar usuarios de demo con permisos elevados:

```sql
UPDATE Users SET role = 'admin' WHERE email = 'admin@example.com';
UPDATE Users SET role = 'it' WHERE email = 'soporte@example.com';
```

Despues de cambiar el role en SQL Server, vuelve a hacer login para obtener un JWT nuevo con el role actualizado.

## Fases futuras

### Resend Email API

Resend esta instalado, pero todavia no se usa en ningun controlador. Una integracion ordenada podria vivir en:

```text
src/services/emailService.js
```

Momentos recomendados para enviar correos en una fase futura:

- Al crear un ticket.
- Al cambiar el estado de un ticket.
- Opcionalmente al cerrar un ticket.

El envio de correo deberia estar aislado con `try/catch` para que un fallo de email no rompa la respuesta principal de la API.

### Socket.IO

Socket.IO esta instalado, pero no integrado todavia. Conviene dejarlo para una fase posterior, cuando el backend REST ya este cerrado para demo.

Casos futuros:

- Notificar tickets nuevos en tiempo real.
- Notificar cambios de estado.
- Mostrar comentarios nuevos sin recargar.
