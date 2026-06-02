# Auth BDD Bearer

Proyecto Node.js + Express + SQL Server + bcrypt + JWT usando autenticacion por `Authorization: Bearer TOKEN`.

No usa cookies, `cookie-parser`, `req.cookies.token` ni usuarios estaticos.

## Requisitos

- Node.js
- SQL Server
- Base de datos `NodeDB`
- Tabla `Users`

## Instalacion

```bash
npm install
```

Copia el archivo `.env.example` a `.env` y ajusta la contrasena de SQL Server:

```env
PORT=3000
DB_USER=sa
DB_PASSWORD=TU_PASSWORD
DB_SERVER=localhost\MSSQLSERVER01
DB_DATABASE=NodeDB
JWT_SECRET=1234567890asdfghjkl
```

## SQL de referencia

```sql
CREATE DATABASE NodeDB;
GO

USE NodeDB;
GO

CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL
);
GO
```

## Ejecutar

Modo desarrollo:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

El servidor levantara en:

```text
http://localhost:3000
```

## Probar en Postman

### 1. Verificar servidor

```http
GET http://localhost:3000/
```

Respuesta esperada:

```json
{
  "status": 200,
  "message": "Server is running"
}
```

### 2. Registrar usuario

```http
POST http://localhost:3000/register
Content-Type: application/json
```

Body:

```json
{
  "name": "Jose Luis",
  "email": "jl@gmail.com",
  "password": "Hola123"
}
```

El password se guarda como hash en la columna `PasswordHash`.

### 3. Iniciar sesion

```http
POST http://localhost:3000/login
Content-Type: application/json
```

Body:

```json
{
  "email": "jl@gmail.com",
  "password": "Hola123"
}
```

Respuesta esperada:

```json
{
  "status": 200,
  "message": "Login successfully",
  "user": {
    "id": 1,
    "name": "Jose Luis",
    "email": "jl@gmail.com"
  },
  "token": "JWT_TOKEN"
}
```

### 4. Consultar perfil protegido

```http
GET http://localhost:3000/profile
Authorization: Bearer JWT_TOKEN
```

En Postman, tambien puedes usar la pestana `Authorization`:

- Type: `Bearer Token`
- Token: pega el token recibido en `/login`

Si el token es valido, `/profile` devuelve los datos decodificados del usuario.

## Estructura

```text
src/
  config/
    db.js
  controllers/
    authController.js
  middlewares/
    authMiddleware.js
  routes/
    authRoutes.js
  server.js
package.json
.env.example
README.md
```
