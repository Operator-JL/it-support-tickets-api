-- antes solo tenia user_id en tickets y eso no dejaba claro si era el creador o el asignado
-- ahora queda separado:
-- user_id = usuario que crea o reporta el ticket
-- assigned_to_user_id = usuario asignado para atenderlo
-- el ticket queda con quien lo crea y con quien se le asigna
-- este script crea la base y las tablas si no existen, no borra nada

IF DB_ID('ITSupportTicketsDB') IS NULL
BEGIN
  CREATE DATABASE ITSupportTicketsDB;
END;
GO

USE ITSupportTicketsDB;
GO

-- tabla principal de usuarios
-- aqui lo de usuarios normales, soporte y admins
-- passwordhash guarda el hash de la contraseña, no la contraseña real
-- email queda unico para evitar usuarios duplicados
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    id INT IDENTITY(1,1) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    [role] NVARCHAR(20) NOT NULL
      CONSTRAINT DF_Users_role DEFAULT ('user'),
    is_active BIT NOT NULL
      CONSTRAINT DF_Users_is_active DEFAULT (0),
    created_at DATETIME NOT NULL
      CONSTRAINT DF_Users_created_at DEFAULT (GETDATE()),

    CONSTRAINT PK_Users PRIMARY KEY (id),
    CONSTRAINT UQ_Users_email UNIQUE (email),
    CONSTRAINT CK_Users_role CHECK ([role] IN ('user', 'it', 'admin'))
  );
END;
GO

-- tabla principal de tickets
-- user_id no es el usuario asignado; es quien crea o reporta el ticket
-- assigned_to_user_id es quien atiende el ticket y puede quedar null al inicio
-- por eso esta tabla tiene dos relaciones hacia users
-- updated_at inicia con getdate; el backend lo actualiza cuando se edita o cambia estado
IF OBJECT_ID('dbo.Tickets', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Tickets (
    id INT IDENTITY(1,1) NOT NULL,
    user_id INT NOT NULL,
    assigned_to_user_id INT NULL,
    title NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(MAX) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    [priority] NVARCHAR(50) NOT NULL
      CONSTRAINT DF_Tickets_priority DEFAULT ('Media'),
    [status] NVARCHAR(50) NOT NULL
      CONSTRAINT DF_Tickets_status DEFAULT ('Abierto'),
    created_at DATETIME NOT NULL
      CONSTRAINT DF_Tickets_created_at DEFAULT (GETDATE()),
    updated_at DATETIME NOT NULL
      CONSTRAINT DF_Tickets_updated_at DEFAULT (GETDATE()),
    closed_at DATETIME NULL,

    CONSTRAINT PK_Tickets PRIMARY KEY (id),
    CONSTRAINT FK_Tickets_Users_Creator FOREIGN KEY (user_id)
      REFERENCES dbo.Users (id),
    CONSTRAINT FK_Tickets_Users_Assigned FOREIGN KEY (assigned_to_user_id)
      REFERENCES dbo.Users (id),
    CONSTRAINT CK_Tickets_priority CHECK ([priority] IN ('Baja', 'Media', 'Alta', 'Urgente')),
    CONSTRAINT CK_Tickets_status CHECK ([status] IN ('Abierto', 'En proceso', 'Cerrado'))
  );

  CREATE INDEX IX_Tickets_user_id ON dbo.Tickets (user_id);
  CREATE INDEX IX_Tickets_assigned_to_user_id ON dbo.Tickets (assigned_to_user_id);
  CREATE INDEX IX_Tickets_status ON dbo.Tickets ([status]);
END;
GO

-- tabla de comentarios del ticket
-- ticket_id indica a que ticket pertenece el comentario
-- user_id indica quien escribio el comentario
-- asi se puede seguir el historial de atencion del ticket
IF OBJECT_ID('dbo.TicketComments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketComments (
    id INT IDENTITY(1,1) NOT NULL,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    comment NVARCHAR(MAX) NOT NULL,
    created_at DATETIME NOT NULL
      CONSTRAINT DF_TicketComments_created_at DEFAULT (GETDATE()),

    CONSTRAINT PK_TicketComments PRIMARY KEY (id),
    CONSTRAINT FK_TicketComments_Tickets FOREIGN KEY (ticket_id)
      REFERENCES dbo.Tickets (id),
    CONSTRAINT FK_TicketComments_Users FOREIGN KEY (user_id)
      REFERENCES dbo.Users (id)
  );

  CREATE INDEX IX_TicketComments_ticket_id ON dbo.TicketComments (ticket_id);
  CREATE INDEX IX_TicketComments_user_id ON dbo.TicketComments (user_id);
END;
GO

-- consultar las comprobaciones

-- 1. ver usuarios sin mostrar passwordhash
SELECT
  id,
  [name],
  email,
  [role],
  is_active,
  created_at
FROM dbo.Users
ORDER BY created_at DESC;
GO

-- 2. ver tickets con el usuario que los creo
SELECT
  t.id AS ticket_id,
  t.title,
  t.[status],
  creator.id AS creador_id,
  creator.[name] AS creado_por
FROM dbo.Tickets t
INNER JOIN dbo.Users creator ON creator.id = t.user_id
ORDER BY t.created_at DESC;
GO

-- 3. ver tickets con creador y usuario asignado
-- una cosa es quien reporta y otra quien atiende
SELECT
  t.id AS ticket_id,
  t.title,
  t.[status],
  creator.[name] AS creado_por,
  assigned.[name] AS asignado_a
FROM dbo.Tickets t
INNER JOIN dbo.Users creator ON creator.id = t.user_id
LEFT JOIN dbo.Users assigned ON assigned.id = t.assigned_to_user_id
ORDER BY t.created_at DESC;
GO

-- 4. ver comentarios con ticket y usuario que comento
SELECT
  c.id AS comment_id,
  c.ticket_id,
  t.title AS ticket_title,
  u.[name] AS comentado_por,
  c.comment,
  c.created_at
FROM dbo.TicketComments c
INNER JOIN dbo.Tickets t ON t.id = c.ticket_id
INNER JOIN dbo.Users u ON u.id = c.user_id
ORDER BY c.created_at ASC;
GO
