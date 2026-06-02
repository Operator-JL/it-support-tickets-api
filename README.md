# IT Support Tickets API

API REST para registrar usuarios, iniciar sesion y administrar tickets de soporte tecnico/IT con autenticacion JWT y SQL Server.

## Descripcion

`it-support-tickets-api` es una API REST desarrollada con Node.js, Express y SQL Server para gestionar usuarios, autenticacion y tickets de soporte IT.

Permite crear tickets, consultar tickets, cambiar su estado y agregar comentarios, usando JWT Bearer Token para proteger las rutas privadas.

## Tecnologias

- Node.js
- Express
- SQL Server
- mssql
- JWT
- bcrypt
- dotenv
- Socket.IO instalado para futura fase
- Resend instalado para futura fase

## Funcionalidades actuales

- Registro de usuarios
- Login con JWT
- Ruta protegida de perfil
- Crear tickets
- Ver todos los tickets
- Ver tickets del usuario autenticado
- Ver ticket por ID
- Agregar comentarios a tickets
- Ver comentarios de tickets
- Cambiar estado del ticket
- Cierre de ticket con `closed_at`

## Estructura del proyecto

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

- `src/config`: configuracion de conexion a SQL Server.
- `src/controllers`: logica de autenticacion, tickets y comentarios.
- `src/middlewares`: middleware JWT para proteger rutas.
- `src/routes`: definicion de endpoints de la API.
- `src/server.js`: punto de entrada del servidor Express.

## Variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
PORT=3000
DB_USER=your_sql_user
DB_PASSWORD=your_sql_password
DB_SERVER=localhost\\MSSQLSERVER01
DB_DATABASE=ITSupportTicketsDB
JWT_SECRET=your_jwt_secret
```

## Endpoints principales

### Auth

```http
POST /register
POST /login
GET /profile
```

### Tickets

```http
POST /tickets
GET /tickets
GET /tickets/my
GET /tickets/:id
PUT /tickets/:id
PATCH /tickets/:id/status
DELETE /tickets/:id
```

### Comments

```http
POST /tickets/:ticketId/comments
GET /tickets/:ticketId/comments
```

## Como ejecutar

Instalar dependencias:

```bash
npm install
```

Crear el archivo `.env` basado en `.env.example` y configurar las variables de entorno.

Ejecutar el servidor:

```bash
node src/server.js
```

El servidor levantara por defecto en:

```text
http://localhost:3000
```

## Estado del proyecto

Backend funcional.

Proximas fases:

- Socket.IO para actualizaciones en tiempo real
- Correos con Resend
- Frontend sencillo
