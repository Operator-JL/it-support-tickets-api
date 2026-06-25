const jwt = require('jsonwebtoken');
const { sql, getConnection } = require('../config/db');

const activeSocketsByUserId = new Map();

const normalizeUserId = (userId) => {
  const numericUserId = Number(userId);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return null;
  }

  return numericUserId;
};

const normalizeRole = (role) => {
  return typeof role === 'string' ? role.toLowerCase() : 'user';
};

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  const authHeader = socket.handshake.headers.authorization;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return '';
};

const getSocketUser = (socket) => {
  const token = getSocketToken(socket);

  if (!token) {
    throw new Error('Authentication token is required');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = normalizeUserId(decoded.id || decoded.Id);

  if (!userId) {
    throw new Error('Invalid token user');
  }

  return {
    id: userId,
    name: decoded.name || decoded.Name,
    email: decoded.email || decoded.Email,
    role: normalizeRole(decoded.role || decoded.Role)
  };
};

const setUserPresence = async (userId, isActive) => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return;
  }

  const pool = await getConnection();

  await pool
    .request()
    .input('Id', sql.Int, normalizedUserId)
    .input('IsActive', sql.Bit, isActive ? 1 : 0)
    .query(`
      UPDATE Users
      SET is_active = @IsActive
      WHERE id = @Id
    `);
};

const resetAllUserPresence = async () => {
  const pool = await getConnection();

  await pool.request().query(`
    UPDATE Users
    SET is_active = 0
    WHERE is_active <> 0
  `);
};

const registerUserSocket = async (userId, socketId) => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return;
  }

  const key = String(normalizedUserId);
  const userSockets = activeSocketsByUserId.get(key) || new Set();
  userSockets.add(socketId);
  activeSocketsByUserId.set(key, userSockets);

  await setUserPresence(normalizedUserId, true);
};

const unregisterUserSocket = async (userId, socketId) => {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return;
  }

  const key = String(normalizedUserId);
  const userSockets = activeSocketsByUserId.get(key);

  if (!userSockets) {
    await setUserPresence(normalizedUserId, false);
    return;
  }

  userSockets.delete(socketId);

  if (userSockets.size === 0) {
    activeSocketsByUserId.delete(key);
    await setUserPresence(normalizedUserId, false);
    return;
  }

  await setUserPresence(normalizedUserId, true);
};

module.exports = {
  getSocketUser,
  registerUserSocket,
  resetAllUserPresence,
  setUserPresence,
  unregisterUserSocket
};
