const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/db');
const { getUserById } = require('../services/userService');
const {
  mapPublicUser,
  mapSessionUser,
  normalizeRole
} = require('../utils/userUtils');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 401,
      message: 'Authorization token is required'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 401,
      message: 'Authorization token is required'
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      status: 401,
      message: 'Invalid or expired token'
    });
  }

  const userId = Number(decoded.id || decoded.Id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      status: 401,
      message: 'Invalid or expired token'
    });
  }

  try {
    const pool = await getConnection();
    const user = await getUserById(pool, userId);

    if (!user) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid or expired token'
      });
    }

    const publicUser = mapPublicUser(user);

    if (!publicUser.is_active) {
      return res.status(403).json({
        status: 403,
        message: 'User is inactive'
      });
    }

    req.user = {
      ...mapSessionUser(user),
      name: publicUser.name || decoded.name || decoded.Name || decoded.nombre || decoded.Nombre,
      email: publicUser.email || decoded.email || decoded.Email || decoded.correo || decoded.Correo,
      role: normalizeRole(publicUser.role)
    };
    return next();
  } catch (error) {
    console.error('[auth] Could not validate token user:', error.message);

    return res.status(500).json({
      status: 500,
      message: 'Error validating session'
    });
  }
};

module.exports = authMiddleware;
