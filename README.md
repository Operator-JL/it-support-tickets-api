# SIST - Sistema Interno de Soporte Tecnico
# OAuth - agregue el correo desarrollowebjeli@gmail.com  para que se pueda probar el iniciar con google

Sistema web para crear, revisar y dar seguimiento a tickets de soporte tecnico.

## Stack

* Node.js
* Express
* SQL Server
* React + Vite
* JWT
* bcrypt
* Google OAuth
* Socket.IO
* Resend opcional para correos

## Configuracion

Backend:

```env
PORT=3000
DB_USER=sa
DB_PASSWORD=
DB_SERVER=
DB_DATABASE=ITSupportTicketsDB
JWT_SECRET=sist_demo_secret_local
FRONTEND_URL=http://localhost:5173

EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM=onboarding@resend.dev
EMAIL_TO=

GOOGLE_CLIENT_ID=
GOOGLE_DEFAULT_ROLE=usuario
GOOGLE_ADMIN_EMAILS=
GOOGLE_ALLOWED_EMAILS=
GOOGLE_ALLOWED_DOMAIN=
```

 `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=
```

Si se usa Google OAuth, agregue un correo que mire que utilizo en clase : desarrollowebjeli@gmail.com
## Base de datos

Ejecutar el script:

database.sql

en SQL Server Management Studio.

El script crea la base: ITSupportTicketsDB



## Usuarios demo

```text
admin@sist.local / Admin123! / admin
soporte@sist.local / Soporte123! / soporte
usuario@sist.local / Usuario123! / usuario
```

## Ejecutar

Backend:

```powershell
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

URLs:

```text
Backend:  http://localhost:3000
Frontend: http://localhost:5173
```

## Roles

* `usuario`: crea y revisa sus propios tickets.
* `soporte`: revisa y actualiza tickets.
* `admin`: administra usuarios, tickets y permisos.

## Nota

Resend esta desactivado por defecto:

```env
EMAIL_ENABLED=false
```

Asi no se envian correos reales durante el testing
