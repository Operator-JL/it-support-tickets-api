const { sql, getConnection } = require('../config/db');

const allowedRoles = ['user', 'it', 'admin'];

const mapUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: String(user.role || 'user').toLowerCase(),
    is_active: user.is_active,
    created_at: user.created_at
  };
};

const getUserId = (id) => {
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
};

const getUsers = async (req, res) => {
  try {
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT
        id,
        name,
        email,
        role,
        is_active,
        created_at
      FROM Users
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      status: 200,
      message: 'Users found',
      users: result.recordset.map(mapUser)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error getting users',
      error: error.message
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const userId = getUserId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid user id'
      });
    }

    const role = typeof req.body.role === 'string'
      ? req.body.role.trim().toLowerCase()
      : '';

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        status: 400,
        message: `Role must be one of: ${allowedRoles.join(', ')}`
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input('Id', sql.Int, userId)
      .input('Role', sql.NVarChar(20), role)
      .query(`
        UPDATE Users
        SET role = @Role
        OUTPUT
          INSERTED.id,
          INSERTED.name,
          INSERTED.email,
          INSERTED.role,
          INSERTED.is_active,
          INSERTED.created_at
        WHERE id = @Id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'User role updated successfully',
      user: mapUser(result.recordset[0])
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error updating user role',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  updateUserRole
};
