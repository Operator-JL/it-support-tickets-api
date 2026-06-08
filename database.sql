-- SQL Server schema for it-support-tickets-api.
-- Run this script inside the database configured by DB_DATABASE.
-- It does not drop or recreate existing tables.

IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL
      CONSTRAINT DF_Users_Role DEFAULT ('user'),
    CreatedAt DATETIME2 NOT NULL
      CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Users PRIMARY KEY (Id),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
  );
END;
GO

IF OBJECT_ID('dbo.Tickets', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Tickets (
    id INT IDENTITY(1,1) NOT NULL,
    user_id INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(MAX) NOT NULL,
    category NVARCHAR(100) NOT NULL,
    priority NVARCHAR(50) NOT NULL
      CONSTRAINT DF_Tickets_Priority DEFAULT ('Media'),
    [status] NVARCHAR(50) NOT NULL
      CONSTRAINT DF_Tickets_Status DEFAULT ('Abierto'),
    created_at DATETIME2 NOT NULL
      CONSTRAINT DF_Tickets_CreatedAt DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NOT NULL
      CONSTRAINT DF_Tickets_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    closed_at DATETIME2 NULL,
    CONSTRAINT PK_Tickets PRIMARY KEY (id),
    CONSTRAINT FK_Tickets_Users FOREIGN KEY (user_id)
      REFERENCES dbo.Users (Id),
    CONSTRAINT CK_Tickets_Priority CHECK (priority IN ('Baja', 'Media', 'Alta', 'Urgente')),
    CONSTRAINT CK_Tickets_Status CHECK ([status] IN ('Abierto', 'En proceso', 'Cerrado'))
  );

  CREATE INDEX IX_Tickets_UserId ON dbo.Tickets (user_id);
  CREATE INDEX IX_Tickets_Status ON dbo.Tickets ([status]);
END;
GO

IF OBJECT_ID('dbo.TicketComments', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketComments (
    id INT IDENTITY(1,1) NOT NULL,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    comment NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL
      CONSTRAINT DF_TicketComments_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_TicketComments PRIMARY KEY (id),
    CONSTRAINT FK_TicketComments_Tickets FOREIGN KEY (ticket_id)
      REFERENCES dbo.Tickets (id),
    CONSTRAINT FK_TicketComments_Users FOREIGN KEY (user_id)
      REFERENCES dbo.Users (Id)
  );

  CREATE INDEX IX_TicketComments_TicketId ON dbo.TicketComments (ticket_id);
  CREATE INDEX IX_TicketComments_UserId ON dbo.TicketComments (user_id);
END;
GO
