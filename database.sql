IF DB_ID('ITSupportTicketsDB') IS NULL
BEGIN
  CREATE DATABASE ITSupportTicketsDB;
END;
GO

USE ITSupportTicketsDB;
GO

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
    CONSTRAINT CK_Users_role CHECK ([role] IN ('admin', 'soporte', 'usuario')),
    CONSTRAINT CK_Users_provider CHECK (provider IN ('local', 'google'))
  );

  CREATE UNIQUE INDEX UX_Users_google_id
    ON dbo.Users (google_id)
    WHERE google_id IS NOT NULL;
END;
GO

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

UPDATE dbo.Users SET [role] = 'usuario' WHERE [role] = 'user';
UPDATE dbo.Users SET [role] = 'soporte' WHERE [role] = 'it';
UPDATE dbo.Users SET [role] = 'soporte' WHERE [role] = 'support';
UPDATE dbo.Users SET [role] = 'soporte' WHERE [role] = 'tecnico';
UPDATE dbo.Users SET [role] = 'soporte' WHERE [role] = 'tecnico_it';
UPDATE dbo.Users SET [role] = 'usuario' WHERE [role] NOT IN ('admin', 'soporte', 'usuario');
GO

ALTER TABLE dbo.Users
  ADD CONSTRAINT CK_Users_role CHECK ([role] IN ('admin', 'soporte', 'usuario'));
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
    target.updated_at = GETDATE()
WHEN NOT MATCHED THEN
  INSERT ([name], email, PasswordHash, [role], is_active, is_online, provider)
  VALUES (source.[name], source.email, source.PasswordHash, source.[role], 1, 0, 'local');
GO

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
  AND COL_LENGTH('dbo.Tickets', 'category') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD category NVARCHAR(100) NOT NULL
      CONSTRAINT DF_Tickets_category DEFAULT ('General') WITH VALUES;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.Tickets', 'priority') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD [priority] NVARCHAR(50) NOT NULL
      CONSTRAINT DF_Tickets_priority DEFAULT ('Media') WITH VALUES;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.Tickets', 'status') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD [status] NVARCHAR(50) NOT NULL
      CONSTRAINT DF_Tickets_status DEFAULT ('Abierto') WITH VALUES;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.Tickets', 'created_at') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD created_at DATETIME NOT NULL
      CONSTRAINT DF_Tickets_created_at DEFAULT (GETDATE()) WITH VALUES;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.Tickets', 'updated_at') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD updated_at DATETIME NOT NULL
      CONSTRAINT DF_Tickets_updated_at DEFAULT (GETDATE()) WITH VALUES;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.Tickets', 'closed_at') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets ADD closed_at DATETIME NULL;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.Tickets', 'assigned_to_user_id') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets ADD assigned_to_user_id INT NULL;
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
BEGIN
  UPDATE dbo.Tickets
  SET [priority] = 'Media'
  WHERE [priority] IS NULL
    OR [priority] NOT IN ('Baja', 'Media', 'Alta', 'Urgente');

  UPDATE dbo.Tickets
  SET [status] = 'Abierto'
  WHERE [status] IS NULL
    OR [status] NOT IN ('Abierto', 'En proceso', 'Cerrado');
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND OBJECT_ID('dbo.FK_Tickets_Users_Creator', 'F') IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.Tickets t
    LEFT JOIN dbo.Users u ON u.id = t.user_id
    WHERE u.id IS NULL
  )
BEGIN
  ALTER TABLE dbo.Tickets
    ADD CONSTRAINT FK_Tickets_Users_Creator FOREIGN KEY (user_id)
      REFERENCES dbo.Users (id);
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND OBJECT_ID('dbo.FK_Tickets_Users_Assigned', 'F') IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.Tickets t
    LEFT JOIN dbo.Users u ON u.id = t.assigned_to_user_id
    WHERE t.assigned_to_user_id IS NOT NULL
      AND u.id IS NULL
  )
BEGIN
  ALTER TABLE dbo.Tickets
    ADD CONSTRAINT FK_Tickets_Users_Assigned FOREIGN KEY (assigned_to_user_id)
      REFERENCES dbo.Users (id);
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND OBJECT_ID('dbo.CK_Tickets_priority', 'C') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD CONSTRAINT CK_Tickets_priority CHECK ([priority] IN ('Baja', 'Media', 'Alta', 'Urgente'));
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND OBJECT_ID('dbo.CK_Tickets_status', 'C') IS NULL
BEGIN
  ALTER TABLE dbo.Tickets
    ADD CONSTRAINT CK_Tickets_status CHECK ([status] IN ('Abierto', 'En proceso', 'Cerrado'));
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Tickets_user_id'
      AND object_id = OBJECT_ID('dbo.Tickets')
  )
BEGIN
  CREATE INDEX IX_Tickets_user_id
    ON dbo.Tickets (user_id);
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

IF OBJECT_ID('dbo.Tickets', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Tickets_status'
      AND object_id = OBJECT_ID('dbo.Tickets')
  )
BEGIN
  CREATE INDEX IX_Tickets_status
    ON dbo.Tickets ([status]);
END;
GO

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

IF OBJECT_ID('dbo.TicketComments', 'U') IS NOT NULL
  AND COL_LENGTH('dbo.TicketComments', 'created_at') IS NULL
BEGIN
  ALTER TABLE dbo.TicketComments
    ADD created_at DATETIME NOT NULL
      CONSTRAINT DF_TicketComments_created_at DEFAULT (GETDATE()) WITH VALUES;
END;
GO

IF OBJECT_ID('dbo.TicketComments', 'U') IS NOT NULL
  AND OBJECT_ID('dbo.FK_TicketComments_Tickets', 'F') IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.TicketComments c
    LEFT JOIN dbo.Tickets t ON t.id = c.ticket_id
    WHERE t.id IS NULL
  )
BEGIN
  ALTER TABLE dbo.TicketComments
    ADD CONSTRAINT FK_TicketComments_Tickets FOREIGN KEY (ticket_id)
      REFERENCES dbo.Tickets (id);
END;
GO

IF OBJECT_ID('dbo.TicketComments', 'U') IS NOT NULL
  AND OBJECT_ID('dbo.FK_TicketComments_Users', 'F') IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.TicketComments c
    LEFT JOIN dbo.Users u ON u.id = c.user_id
    WHERE u.id IS NULL
  )
BEGIN
  ALTER TABLE dbo.TicketComments
    ADD CONSTRAINT FK_TicketComments_Users FOREIGN KEY (user_id)
      REFERENCES dbo.Users (id);
END;
GO

IF OBJECT_ID('dbo.TicketComments', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_TicketComments_ticket_id'
      AND object_id = OBJECT_ID('dbo.TicketComments')
  )
BEGIN
  CREATE INDEX IX_TicketComments_ticket_id
    ON dbo.TicketComments (ticket_id);
END;
GO

IF OBJECT_ID('dbo.TicketComments', 'U') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_TicketComments_user_id'
      AND object_id = OBJECT_ID('dbo.TicketComments')
  )
BEGIN
  CREATE INDEX IX_TicketComments_user_id
    ON dbo.TicketComments (user_id);
END;
GO

SELECT
  id,
  [name],
  email,
  [role],
  is_active,
  is_online,
  provider,
  google_id,
  created_at,
  updated_at,
  last_login_at
FROM dbo.Users
ORDER BY created_at DESC;
GO

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
