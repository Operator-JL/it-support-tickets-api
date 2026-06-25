# SIST - IT Support Tickets API

Sistema interno de soporte técnico para crear, revisar y dar seguimiento a tickets.

## stack

Backend: Node.js, Express, SQL Server, JWT, bcrypt, Socket.IO, Resend.

Frontend: Vite, React, Tailwind CSS.

## correr backend

```powershell
cd C:\Users\jlozo\Desktop\JL-it-support-tickets-api
npm run dev
```

## correr frontend

```powershell
cd C:\Users\jlozo\Desktop\JL-it-support-tickets-api\frontend
npm run dev
```

## URL

Backend: [http://localhost:3000](http://localhost:3000/)

Frontend: [http://localhost:5173](http://localhost:5173/)

## Cuentas demo

- [admin@sist.local](mailto:admin@sist.local) / Admin123!
- [it@sist.local](mailto:it@sist.local) / It123!
- [usuario1@sist.local](mailto:usuario1@sist.local) / User123!
- [usuario2@sist.local](mailto:usuario2@sist.local) / User123!

## Base de datos

El script oficial está en `database.sql`.

Ese script crea `Users`, `Tickets` y `TicketComments`.

`Tickets.user_id` es quien reporta o crea el ticket.

`Tickets.assigned_to_user_id` queda preparado para guardar quien atiende el ticket y puede ser `NULL`.

## Flujo de prueba

1. Entrar como usuario1.
2. Crear un ticket.
3. Entrar como admin o it.
4. Ver el ticket aparecer en tiempo real.
5. Cambiar el estado a Cerrado.
6. Revisar que llegue correo por Resend.

## Notas

Socket.IO actualiza tickets y comentarios en tiempo real.

Resend manda correos al crear y cerrar tickets.