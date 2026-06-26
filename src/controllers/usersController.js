const bcrypt = require('bcrypt');
const { getConnection } = require('../config/db');
const {
  countActiveAdmins,
  createLocalUser,
  getUserByEmail,
  getUserById: getUserByIdFromDb,
  getUsers: getUsersFromDb,
  updateUser,
  updateUserPassword,
  updateUserStatus
} = require('../services/userService');
const {
  VALID_ROLES,
  getRoleForStorage,
  mapPublicUser
} = require('../utils/userUtils');

const getUserId = (id) => {
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
};

const getText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const getName = (body = {}) => {
  return getText(body.name !== undefined ? body.name : body.nombre);
};

const getEmail = (body = {}) => {
  return getText(body.email !== undefined ? body.email : body.correo).toLowerCase();
};

const getBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const cleanValue = value.trim().toLowerCase();
    if (cleanValue === 'true' || cleanValue === '1') {
      return true;
    }
    if (cleanValue === 'false' || cleanValue === '0') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return null;
};

const sendDuplicateEmail = (res) => {
  return res.status(409).json({
    status: 409,
    message: 'Email already exists'
  });
};

const getUsers = async (req, res) => {
  try {
    const pool = await getConnection();
    const users = await getUsersFromDb(pool);

    return res.status(200).json({
      status: 200,
      message: 'Users found',
      users
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error getting users',
      error: error.message
    });
  }
};

const createUser = async (req, res) => {
  try {
    const name = getName(req.body);
    const email = getEmail(req.body);
    const password = getText(req.body.password);
    const role = getRoleForStorage(req.body.role);

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        status: 400,
        message: `Name, email, password and role are required. Role must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    const pool = await getConnection();
    const existingUser = await getUserByEmail(pool, email);

    if (existingUser) {
      return sendDuplicateEmail(res);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createLocalUser(pool, {
      name,
      email,
      passwordHash,
      role
    });

    return res.status(201).json({
      status: 201,
      message: 'User created successfully',
      user: mapPublicUser(user)
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return sendDuplicateEmail(res);
    }

    return res.status(500).json({
      status: 500,
      message: 'Error creating user',
      error: error.message
    });
  }
};

const editUser = async (req, res) => {
  try {
    const userId = getUserId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid user id'
      });
    }

    const updates = {};

    if (req.body.name !== undefined || req.body.nombre !== undefined) {
      const name = getName(req.body);
      if (!name) {
        return res.status(400).json({
          status: 400,
          message: 'Name cannot be empty'
        });
      }
      updates.name = name;
    }

    if (req.body.email !== undefined || req.body.correo !== undefined) {
      const email = getEmail(req.body);
      if (!email) {
        return res.status(400).json({
          status: 400,
          message: 'Email cannot be empty'
        });
      }
      updates.email = email;
    }

    if (req.body.role !== undefined) {
      const role = getRoleForStorage(req.body.role);
      if (!role) {
        return res.status(400).json({
          status: 400,
          message: `Role must be one of: ${VALID_ROLES.join(', ')}`
        });
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'At least one field is required'
      });
    }

    const pool = await getConnection();

    if (updates.role !== undefined) {
      const existingUser = await getUserByIdFromDb(pool, userId);

      if (!existingUser) {
        return res.status(404).json({
          status: 404,
          message: 'User not found'
        });
      }

      const publicUser = mapPublicUser(existingUser);
      const isAdminDemotion = publicUser.role === 'admin' && updates.role !== 'admin';

      if (isAdminDemotion && Number(req.user.id) === Number(userId)) {
        return res.status(400).json({
          status: 400,
          message: 'You cannot remove your own admin role'
        });
      }

      if (isAdminDemotion && publicUser.is_active) {
        const activeAdminCount = await countActiveAdmins(pool);

        if (activeAdminCount <= 1) {
          return res.status(400).json({
            status: 400,
            message: 'You cannot remove the last active admin user'
          });
        }
      }
    }

    const user = await updateUser(pool, userId, updates);

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'User updated successfully',
      user: mapPublicUser(user)
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return sendDuplicateEmail(res);
    }

    return res.status(500).json({
      status: 500,
      message: 'Error updating user',
      error: error.message
    });
  }
};

const updateUserRole = async (req, res) => {
  req.body = {
    role: req.body.role
  };

  return editUser(req, res);
};

const updateStatus = async (req, res) => {
  try {
    const userId = getUserId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid user id'
      });
    }

    const rawStatus = req.body.is_active !== undefined
      ? req.body.is_active
      : req.body.isActive !== undefined
        ? req.body.isActive
        : req.body.active;
    const isActive = getBoolean(rawStatus);

    if (isActive === null) {
      return res.status(400).json({
        status: 400,
        message: 'is_active must be true or false'
      });
    }

    if (Number(req.user.id) === Number(userId) && !isActive) {
      return res.status(400).json({
        status: 400,
        message: 'You cannot deactivate your own user'
      });
    }

    const pool = await getConnection();
    const existingUser = await getUserByIdFromDb(pool, userId);

    if (!existingUser) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    const publicUser = mapPublicUser(existingUser);

    if (!isActive && publicUser.role === 'admin' && publicUser.is_active) {
      const activeAdminCount = await countActiveAdmins(pool);

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          status: 400,
          message: 'You cannot deactivate the last active admin user'
        });
      }
    }

    const user = await updateUserStatus(pool, userId, isActive);

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'User status updated successfully',
      user: mapPublicUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error updating user status',
      error: error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = getUserId(req.params.id);
    const password = getText(req.body.password);

    if (!userId) {
      return res.status(400).json({
        status: 400,
        message: 'Invalid user id'
      });
    }

    if (!password) {
      return res.status(400).json({
        status: 400,
        message: 'Password is required'
      });
    }

    const pool = await getConnection();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await updateUserPassword(pool, userId, passwordHash);

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'User password updated successfully',
      user: mapPublicUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error updating user password',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  editUser,
  updateUserRole,
  updateStatus,
  changePassword
};
