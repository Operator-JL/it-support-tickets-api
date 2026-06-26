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
    PasswordHash NVARCHAR(255) NULL,
    [role] NVARCHAR(20) NOT NULL
      CONSTRAINT DF_Users_role DEFAULT ('usuario'),
    is_active BIT NOT NULL
      CONSTRAINT DF_Users_is_active DEFAULT (1),
    is_online BIT NOT NULL
      CONSTRAINT DF_Users_is_online DEFAULT (0),
    provider NVARCHAR(20) NOT NULL
      CONSTRAINT DF_Users_provider DEFAULT ('local'),
    google_id NVARCHAR(255) NULL,
    created_at DATETIME NOT NULL
      CONSTRAINT DF_Users_created_at DEFAULT (GETDATE()),
    updated_at DATETIME NOT NULL
      CONSTRAINT DF_Users_updated_at DEFAULT (GETDATE()),
    last_login_at DATETIME NULL,

    CONSTRAINT PK_Users PRIMARY KEY (id),
    CONSTRAINT UQ_Users_email UNIQUE (email),
    CONSTRAINT CK_Users_role CHECK ([role] IN ('admin', 'soporte', 'usuario', 'it', 'user')),
    CONSTRAINT CK_Users_provider CHECK (provider IN ('local', 'google'))
  );

  CREATE UNIQUE INDEX UX_Users_google_id
    ON dbo.Users (google_id)
    WHERE google_id IS NOT NULL;
END;
GO

-- migraciones pequenas para bases ya creadas con la version anterior
IF COL_LENGTH('dbo.Users', 'is_active') IS NULL
BEGIN
  ALTER TABLE dbo.Users
    ADD is_active BIT NOT NULL
      CONSTRAINT DF_Users_is_active DEFAULT (1) WITH VALUES;
END;
GO

IF COL_LENGTH('dbo.Users', 'PasswordHash') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Users ALTER COLUMN PasswordHash NVARCHAR(255) NULL;
END;
GO

IF COL_LENGTH('dbo.Users', 'is_online') IS NULL
BEGIN
  ALTER TABLE dbo.Users
    ADD is_online BIT NOT NULL
      CONSTRAINT DF_Users_is_online DEFAULT (0);

  -- antes is_active se usaba como presencia; desde ahora is_active es cuenta habilitada
  UPDATE dbo.Users SET is_active = 1;
END;
GO

IF COL_LENGTH('dbo.Users', 'provider') IS NULL
BEGIN
  ALTER TABLE dbo.Users
    ADD provider NVARCHAR(20) NOT NULL
      CONSTRAINT DF_Users_provider DEFAULT ('local') WITH VALUES;
END;
GO

IF COL_LENGTH('dbo.Users', 'google_id') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD google_id NVARCHAR(255) NULL;
END;
GO

IF COL_LENGTH('dbo.Users', 'updated_at') IS NULL
BEGIN
  ALTER TABLE dbo.Users
    ADD updated_at DATETIME NOT NULL
      CONSTRAINT DF_Users_updated_at DEFAULT (GETDATE()) WITH VALUES;
END;
GO

IF COL_LENGTH('dbo.Users', 'last_login_at') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD last_login_at DATETIME NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE [name] = 'UQ_Users_email'
    AND parent_object_id = OBJECT_ID('dbo.Users')
)
AND NOT EXISTS (
  SELECT 1
  FROM dbo.Users
  GROUP BY email
  HAVING COUNT(*) > 1
)
BEGIN
  ALTER TABLE dbo.Users
    ADD CONSTRAINT UQ_Users_email UNIQUE (email);
END;
GO

IF OBJECT_ID('dbo.CK_Users_role', 'C') IS NOT NULL
BEGIN
  ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_role;
END;
GO

ALTER TABLE dbo.Users
  ADD CONSTRAINT CK_Users_role CHECK ([role] IN ('admin', 'soporte', 'usuario', 'it', 'user'));
GO

IF OBJECT_ID('dbo.CK_Users_provider', 'C') IS NULL
BEGIN
  ALTER TABLE dbo.Users
    ADD CONSTRAINT CK_Users_provider CHECK (provider IN ('local', 'google'));
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_Users_google_id'
    AND object_id = OBJECT_ID('dbo.Users')
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_google_id
    ON dbo.Users (google_id)
    WHERE google_id IS NOT NULL;
END;
GO

UPDATE dbo.Users SET [role] = 'usuario' WHERE [role] = 'user';
UPDATE dbo.Users SET [role] = 'soporte' WHERE [role] = 'it';
GO

-- usuarios demo oficiales
MERGE dbo.Users AS target
USING (
  VALUES
    (N'Administrador SIST', N'admin@sist.local', N'$2b$10$gVeaQVgkN3ENGaeld7NzcueePot1wflTkPABB0tPoZSXMiFlBhaWO', N'admin'),
    (N'Soporte SIST', N'soporte@sist.local', N'$2b$10$RYrP/yqtPkiNnorO6qixQ.9ZGvWEGCAKjeg83szA2lmIV94qMdkHe', N'soporte'),
    (N'Usuario Demo', N'usuario@sist.local', N'$2b$10$SQVuvOnKoVKBFuT/dn1nCO9LcngC6d1bU534.h.V7ISEMerBayf0e', N'usuario')
) AS source ([name], email, PasswordHash, [role])
ON target.email = source.email
WHEN MATCHED THEN
  UPDATE SET
    target.[name] = source.[name],
    target.PasswordHash = source.PasswordHash,
    target.[role] = source.[role],
    target.is_active = 1,
    target.is_online = 0,
    target.provider = 'local',
    target.google_id = NULL,
    target.updated_at = GETDATE()
WHEN NOT MATCHED THEN
  INSERT ([name], email, PasswordHash, [role], is_active, is_online, provider)
  VALUES (source.[name], source.email, source.PasswordHash, source.[role], 1, 0, 'local');
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

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.Tickets', 'assigned_to_user_id') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets ADD assigned_to_user_id INT NULL;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND OBJECT_ID('dbo.FK_Tickets_Users_Assigned', 'F') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD CONSTRAINT FK_Tickets_Users_Assigned FOREIGN KEY (assigned_to_user_id)
      REFERENCES dbo.Users (id);
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Tickets_assigned_to_user_id'
      AND object_id = OBJECT_ID('dbo.Tickets')
  )
BEGIN
  CREATE INDEX IX_Tickets_assigned_to_user_id
    ON dbo.Tickets (assigned_to_user_id);
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
  is_online,
  provider,
  created_at,
  updated_at,
  last_login_at
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
