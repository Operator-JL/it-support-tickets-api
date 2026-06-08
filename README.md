# IT Support Tickets API

API REST para gestionar tickets de soporte tecnico/IT. El proyecto esta construido con Node.js, Express, SQL Server y autenticacion JWT.

El backend permite registrar usuarios, iniciar sesion, consultar el perfil autenticado, crear tickets, administrar su estado y agregar comentarios a tickets.

## Tecnologias

- Node.js
- Express
- SQL Server
- mssql
- JSON Web Token (JWT)
- bcrypt
- dotenv
- nodemon para desarrollo
- Resend instalado para una fase futura
- Socket.IO instalado para una fase futura

## Estado actual

- Backend REST funcional.
- Autenticacion con JWT Bearer Token.
- Rutas privadas protegidas con middleware de autenticacion.
- Tickets con flujo basico: abierto, en proceso y cerrado.
- Comentarios asociados a tickets.
- Resend y Socket.IO estan instalados/preparados, pero todavia no estan integrados en el flujo principal.
- No hay frontend en esta fase.

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
  routes/
    authRoutes.js
    ticketsRoutes.js
    ticketCommentsRoutes.js
  server.js
```

## Instalacion

Instala las dependencias:

```bash
npm install
```

Crea un archivo `.env` basado en `.env.example` y configura las variables necesarias para tu entorno local.

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

Ejecutar en modo normal:

```bash
npm start
```

Ejecutar en modo desarrollo con nodemon:

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
