# SIST - Modelo de base de datos

Este documento explica el modelo relacional propuesto para SIST: Sistema Interno de Soporte Tecnico.

El objetivo del modelo es distinguir claramente entre:

- el usuario que crea o reporta un ticket;
- el usuario responsable asignado para atender ese ticket;
- los usuarios que comentan durante el seguimiento.

## Archivos relacionados

- `database.sql`: script anterior/base del proyecto.
- `database.sql`: script limpio y defendible para una base reproducible en SQL Server.

`database.sql` no usa `DROP DATABASE` ni `DROP TABLE`. Esta pensado para ejecutarse en una base vacia o para revisarse antes de aplicarlo sobre una base existente.

## Tablas principales

### Users

Representa a los usuarios del sistema.

Columnas:

- `id`: identificador principal del usuario.
- `name`: nombre visible.
- `email`: correo unico para login.
- `PasswordHash`: hash de la contrasena.
- `role`: rol del usuario.
- `is_active`: indica si la cuenta esta activa.
- `created_at`: fecha de creacion.

Roles validos:

- `user`
- `it`
- `admin`

### Tickets

Representa solicitudes de soporte.

Columnas principales:

- `id`: identificador principal del ticket.
- `user_id`: usuario que creo o reporto el ticket.
- `assigned_to_user_id`: usuario asignado para atender el ticket.
- `title`: titulo del problema.
- `description`: descripcion del problema.
- `category`: categoria del ticket.
- `priority`: prioridad.
- `status`: estado.
- `created_at`: fecha de creacion.
- `updated_at`: fecha de ultima actualizacion.
- `closed_at`: fecha de cierre, si aplica.

Prioridades validas:

- `Baja`
- `Media`
- `Alta`
- `Urgente`

Estados validos:

- `Abierto`
- `En proceso`
- `Cerrado`

### TicketComments

Representa comentarios dentro de un ticket.

Columnas:

- `id`: identificador del comentario.
- `ticket_id`: ticket al que pertenece el comentario.
- `user_id`: usuario que escribio el comentario.
- `comment`: texto del comentario.
- `created_at`: fecha del comentario.

## Significado de `Tickets.user_id`

`Tickets.user_id` representa al usuario que creo o reporto el ticket.

Ejemplo:

Si Mariana crea un ticket porque no puede acceder al correo, entonces el ticket debe guardar el `id` de Mariana en `user_id`.

Esta columna sirve para responder:

- Quien reporto el problema?
- Que tickets creo este usuario?
- Que tickets puede ver un usuario normal?

En el backend actual, `user_id` tambien se usa para reglas de ownership: un usuario con rol `user` solo ve sus propios tickets.

## Significado de `Tickets.assigned_to_user_id`

`Tickets.assigned_to_user_id` representa al usuario responsable de atender el ticket.

Ejemplo:

Si Mariana reporta el problema y Carlos de soporte lo va a resolver, entonces:

- `user_id` = Mariana.
- `assigned_to_user_id` = Carlos.

Esta columna puede ser `NULL` porque un ticket puede crearse sin asignacion inicial.

Esta columna sirve para responder:

- Quien esta encargado de atender el ticket?
- Que tickets tiene asignados cada agente de soporte?
- Que carga de trabajo tiene el equipo IT?

## Por que Tickets tiene dos relaciones hacia Users

`Tickets` se relaciona dos veces con `Users` porque son dos conceptos diferentes:

1. Creador/reportador del ticket.
2. Responsable asignado para resolverlo.

Ambos valores apuntan a la misma tabla `Users`, pero tienen significados distintos.

Relaciones:

```text
Users.id -> Tickets.user_id
Users.id -> Tickets.assigned_to_user_id
```

En SQL:

```sql
CONSTRAINT FK_Tickets_Users_Creator
  FOREIGN KEY (user_id) REFERENCES dbo.Users (id)

CONSTRAINT FK_Tickets_Users_Assigned
  FOREIGN KEY (assigned_to_user_id) REFERENCES dbo.Users (id)
```

## Relacion Users -> Tickets

Un usuario puede crear muchos tickets.

```text
Users 1 ----- N Tickets
       user_id
```

Un usuario tambien puede tener muchos tickets asignados.

```text
Users 1 ----- N Tickets
       assigned_to_user_id
```

## Relacion Tickets -> TicketComments

Un ticket puede tener muchos comentarios.

```text
Tickets 1 ----- N TicketComments
```

Cada comentario pertenece a un ticket y tambien registra que usuario lo escribio.

```text
Users 1 ----- N TicketComments
```

## Por que existe PasswordHash

`PasswordHash` guarda el hash de la contrasena, no la contrasena en texto plano.

El backend usa `bcrypt` para comparar la contrasena enviada en login contra este hash.

Esto permite autenticar usuarios sin guardar contrasenas reales en la base de datos.

## Como correr `database.sql`

1. Crear o seleccionar una base de datos de SQL Server para pruebas.
2. Abrir `database.sql` en SQL Server Management Studio o Azure Data Studio.
3. Confirmar que estas usando la base correcta.
4. Ejecutar el script completo.
5. Revisar que existan las tablas:

```sql
SELECT name
FROM sys.tables
WHERE name IN ('Users', 'Tickets', 'TicketComments');
```

El script no borra datos. Para una reconstruccion real desde cero, crea una base nueva y ejecuta el script ahi.

## Como demostrar la relacion en clase

La query mas importante para explicar el nuevo modelo es:

```sql
SELECT
  t.id AS ticket_id,
  t.title,
  t.status,
  creator.name AS creado_por,
  assigned.name AS asignado_a
FROM Tickets t
INNER JOIN Users creator ON creator.id = t.user_id
LEFT JOIN Users assigned ON assigned.id = t.assigned_to_user_id;
```

Esta query demuestra que:

- `creado_por` viene de `Tickets.user_id`;
- `asignado_a` viene de `Tickets.assigned_to_user_id`;
- `assigned_to_user_id` puede ser `NULL`, por eso se usa `LEFT JOIN`.

## Estado actual de la app

La app actual ya usa:

- `Tickets.user_id` como creador/owner del ticket.
- `TicketComments.user_id` como autor del comentario.
- `Users.role` para permisos.

La app actual todavia no usa `assigned_to_user_id`.

## Cambios futuros para usar asignacion

Para que la app use `assigned_to_user_id`, despues haria falta:

1. Backend:
   - incluir `assigned_to_user_id` en `SELECT`, `OUTPUT` y `mapTicket`;
   - permitir asignar o cambiar responsable en un endpoint protegido;
   - decidir si solo `admin` o tambien `it` puede asignar tickets;
   - opcionalmente filtrar tickets por asignado.

2. Frontend:
   - mostrar el usuario asignado en la tabla o detalle;
   - agregar un select de usuario responsable para `admin` o `it`;
   - actualizar el ticket despues de asignarlo.

3. README:
   - documentar el nuevo campo y el flujo de asignacion.
