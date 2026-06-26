const { sql } = require('../config/db');
const {
  DEFAULT_ROLE,
  getRoleForStorage,
  mapPublicUser
} = require('../utils/userUtils');

let userSchemaCache = null;

const getUserSchema = async (pool) => {
  if (userSchemaCache) {
    return userSchemaCache;
  }

  const result = await pool.request().query(`
    SELECT
      LOWER(COLUMN_NAME) AS column_name,
      IS_NULLABLE AS is_nullable
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'Users'
  `);

  const columns = new Map(
    result.recordset.map((column) => [
      column.column_name,
      column.is_nullable === 'YES'
    ])
  );

  userSchemaCache = {
    hasIsActive: columns.has('is_active'),
    hasIsOnline: columns.has('is_online'),
    hasProvider: columns.has('provider'),
    hasGoogleId: columns.has('google_id'),
    hasUpdatedAt: columns.has('updated_at'),
    hasLastLoginAt: columns.has('last_login_at'),
    passwordHashNullable: columns.get('passwordhash') === true
  };

  return userSchemaCache;
};

const clearUserSchemaCache = () => {
  userSchemaCache = null;
};

const column = (name, tableAlias = '') => {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `${prefix}${name}`;
};

const buildUserSelect = (schema, { includePassword = false, tableAlias = '' } = {}) => {
  const columns = [
    `${column('id', tableAlias)} AS id`,
    `${column('[name]', tableAlias)} AS name`,
    `${column('email', tableAlias)} AS email`,
    `${column('[role]', tableAlias)} AS role`
  ];

  if (includePassword) {
    columns.push(`${column('PasswordHash', tableAlias)} AS password_hash`);
  }

  if (schema.hasIsActive) {
    columns.push(`${column('is_active', tableAlias)} AS is_active`);
  } else {
    columns.push('CAST(1 AS bit) AS is_active');
  }

  if (schema.hasIsOnline) {
    columns.push(`${column('is_online', tableAlias)} AS is_online`);
  } else {
    columns.push('CAST(0 AS bit) AS is_online');
  }

  columns.push(
    schema.hasProvider
      ? `${column('provider', tableAlias)} AS provider`
      : `'local' AS provider`
  );
  columns.push(
    schema.hasGoogleId
      ? `${column('google_id', tableAlias)} AS google_id`
      : 'CAST(NULL AS nvarchar(255)) AS google_id'
  );
  columns.push(`${column('created_at', tableAlias)} AS created_at`);
  columns.push(
    schema.hasUpdatedAt
      ? `${column('updated_at', tableAlias)} AS updated_at`
      : 'CAST(NULL AS datetime) AS updated_at'
  );
  columns.push(
    schema.hasLastLoginAt
      ? `${column('last_login_at', tableAlias)} AS last_login_at`
      : 'CAST(NULL AS datetime) AS last_login_at'
  );

  return columns.join(',\n        ');
};

const getUsers = async (pool) => {
  const schema = await getUserSchema(pool);
  const result = await pool.request().query(`
    SELECT
        ${buildUserSelect(schema)}
    FROM Users
    ORDER BY created_at DESC
  `);

  return result.recordset.map(mapPublicUser);
};

const getUserByEmail = async (pool, email, { includePassword = false } = {}) => {
  const schema = await getUserSchema(pool);
  const result = await pool
    .request()
    .input('Email', sql.NVarChar(150), email)
    .query(`
      SELECT
        ${buildUserSelect(schema, { includePassword })}
      FROM Users
      WHERE LOWER(email) = @Email
    `);

  return result.recordset[0] || null;
};

const getUserById = async (pool, id) => {
  const schema = await getUserSchema(pool);
  const result = await pool
    .request()
    .input('Id', sql.Int, Number(id))
    .query(`
      SELECT
        ${buildUserSelect(schema)}
      FROM Users
      WHERE id = @Id
    `);

  return result.recordset[0] || null;
};

const countActiveAdmins = async (pool) => {
  const schema = await getUserSchema(pool);

  if (!schema.hasIsActive) {
    return 0;
  }

  const result = await pool.request().query(`
    SELECT COUNT(1) AS total
    FROM Users
    WHERE [role] = 'admin'
      AND is_active = 1
  `);

  return Number(result.recordset[0]?.total || 0);
};

const createLocalUser = async (pool, { name, email, passwordHash, role = DEFAULT_ROLE }) => {
  const schema = await getUserSchema(pool);
  const columns = ['[name]', 'email', 'PasswordHash', '[role]'];
  const values = ['@Name', '@Email', '@PasswordHash', '@Role'];
  const request = pool
    .request()
    .input('Name', sql.NVarChar(100), name)
    .input('Email', sql.NVarChar(150), email)
    .input('PasswordHash', sql.NVarChar(255), passwordHash)
    .input('Role', sql.NVarChar(20), getRoleForStorage(role) || DEFAULT_ROLE);

  if (schema.hasIsActive && schema.hasIsOnline) {
    columns.push('is_active');
    values.push('1');
  }

  if (schema.hasIsOnline) {
    columns.push('is_online');
    values.push('0');
  }

  if (schema.hasProvider) {
    columns.push('provider');
    values.push(`'local'`);
  }

  const result = await request.query(`
    INSERT INTO Users (${columns.join(', ')})
    OUTPUT
        ${buildUserSelect(schema, { tableAlias: 'INSERTED' })}
    VALUES (${values.join(', ')})
  `);

  return result.recordset[0];
};

const createGoogleUser = async (pool, { name, email, googleId }) => {
  const schema = await getUserSchema(pool);

  if (!schema.hasProvider || !schema.hasGoogleId || !schema.passwordHashNullable) {
    throw new Error('Google user schema is not ready. Run database.sql before enabling Google login.');
  }

  const columns = [
    '[name]',
    'email',
    'PasswordHash',
    '[role]',
    'provider',
    'google_id'
  ];
  const values = [
    '@Name',
    '@Email',
    'NULL',
    '@Role',
    `'google'`,
    '@GoogleId'
  ];

  if (schema.hasIsActive) {
    columns.push('is_active');
    values.push('1');
  }

  if (schema.hasIsOnline) {
    columns.push('is_online');
    values.push('0');
  }

  const result = await pool
    .request()
    .input('Name', sql.NVarChar(100), name)
    .input('Email', sql.NVarChar(150), email)
    .input('Role', sql.NVarChar(20), DEFAULT_ROLE)
    .input('GoogleId', sql.NVarChar(255), googleId)
    .query(`
      INSERT INTO Users (${columns.join(', ')})
      OUTPUT
        ${buildUserSelect(schema, { tableAlias: 'INSERTED' })}
      VALUES (${values.join(', ')})
    `);

  return result.recordset[0];
};

const updateUser = async (pool, userId, { name, email, role }) => {
  const schema = await getUserSchema(pool);
  const request = pool.request().input('Id', sql.Int, Number(userId));
  const updates = [];

  if (name !== undefined) {
    request.input('Name', sql.NVarChar(100), name);
    updates.push('[name] = @Name');
  }

  if (email !== undefined) {
    request.input('Email', sql.NVarChar(150), email);
    updates.push('email = @Email');
  }

  if (role !== undefined) {
    request.input('Role', sql.NVarChar(20), getRoleForStorage(role));
    updates.push('[role] = @Role');
  }

  if (schema.hasUpdatedAt) {
    updates.push('updated_at = GETDATE()');
  }

  if (updates.length === 0) {
    return getUserById(pool, userId);
  }

  const result = await request.query(`
    UPDATE Users
    SET ${updates.join(', ')}
    WHERE id = @Id
  `);

  if (result.rowsAffected[0] === 0) {
    return null;
  }

  return getUserById(pool, userId);
};

const updateUserStatus = async (pool, userId, isActive) => {
  const schema = await getUserSchema(pool);

  if (!schema.hasIsActive) {
    throw new Error('User active status column is not available.');
  }

  const updates = ['is_active = @IsActive'];

  if (schema.hasUpdatedAt) {
    updates.push('updated_at = GETDATE()');
  }

  const result = await pool
    .request()
    .input('Id', sql.Int, Number(userId))
    .input('IsActive', sql.Bit, isActive === true ? 1 : 0)
    .query(`
      UPDATE Users
      SET ${updates.join(', ')}
      WHERE id = @Id
    `);

  if (result.rowsAffected[0] === 0) {
    return null;
  }

  return getUserById(pool, userId);
};

const updateUserPassword = async (pool, userId, passwordHash) => {
  const schema = await getUserSchema(pool);
  const updates = [
    'PasswordHash = @PasswordHash'
  ];

  if (schema.hasProvider) {
    updates.push(`provider = 'local'`);
  }

  if (schema.hasGoogleId) {
    updates.push('google_id = NULL');
  }

  if (schema.hasUpdatedAt) {
    updates.push('updated_at = GETDATE()');
  }

  const result = await pool
    .request()
    .input('Id', sql.Int, Number(userId))
    .input('PasswordHash', sql.NVarChar(255), passwordHash)
    .query(`
      UPDATE Users
      SET ${updates.join(', ')}
      WHERE id = @Id
    `);

  if (result.rowsAffected[0] === 0) {
    return null;
  }

  return getUserById(pool, userId);
};

const linkGoogleUser = async (pool, userId, googleId) => {
  const schema = await getUserSchema(pool);
  const updates = [];

  if (schema.hasGoogleId) {
    updates.push('google_id = COALESCE(google_id, @GoogleId)');
  }

  if (schema.hasUpdatedAt) {
    updates.push('updated_at = GETDATE()');
  }

  if (updates.length === 0) {
    return getUserById(pool, userId);
  }

  const result = await pool
    .request()
    .input('Id', sql.Int, Number(userId))
    .input('GoogleId', sql.NVarChar(255), googleId)
    .query(`
      UPDATE Users
      SET ${updates.join(', ')}
      WHERE id = @Id
    `);

  if (result.rowsAffected[0] === 0) {
    return null;
  }

  return getUserById(pool, userId);
};

const touchLastLogin = async (pool, userId) => {
  const schema = await getUserSchema(pool);

  if (!schema.hasLastLoginAt) {
    return;
  }

  await pool
    .request()
    .input('Id', sql.Int, Number(userId))
    .query(`
      UPDATE Users
      SET last_login_at = GETDATE()
      WHERE id = @Id
    `);
};

const getPresenceColumn = async (pool) => {
  const schema = await getUserSchema(pool);

  // La presencia no debe usar is_active como fallback: eso desactiva cuentas reales.
  return schema.hasIsOnline ? 'is_online' : null;
};

module.exports = {
  buildUserSelect,
  clearUserSchemaCache,
  countActiveAdmins,
  createGoogleUser,
  createLocalUser,
  getPresenceColumn,
  getUserByEmail,
  getUserById,
  getUserSchema,
  getUsers,
  linkGoogleUser,
  touchLastLogin,
  updateUser,
  updateUserPassword,
  updateUserStatus
};
