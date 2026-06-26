const jwt = require('jsonwebtoken');
const { sql, getConnection } = require('../config/db');
const { getPresenceColumn, getUserById } = require('./userService');
const {
  getTokenPayload,
  mapPublicUser,
  mapSessionUser
} = require('../utils/userUtils');

const userSockets = new Map();
const userPresenceVersions = new Map();

const bumpPresenceVersion = (userId) => {
  const nextVersion = (userPresenceVersions.get(userId) || 0) + 1;
  userPresenceVersions.set(userId, nextVersion);
  return nextVersion;
};

const setUserPresenceIfCurrent = async (userId, isOnline, version) => {
  if (userPresenceVersions.get(userId) !== version) {
    return;
  }

  await setUserPresence(userId, isOnline);

  if (!isOnline && userPresenceVersions.get(userId) !== version && userSockets.has(userId)) {
    await setUserPresence(userId, true);
  }
};

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  const headerToken = socket.handshake.headers.authorization;

  if (authToken) {
    return authToken;
  }

  if (headerToken && headerToken.startsWith('Bearer ')) {
    return headerToken.slice(7);
  }

  return null;
};

const getSocketUser = async (socket) => {
  const token = getSocketToken(socket);

  if (!token) {
    throw new Error('Token is required');
  }

  const decodedUser = getTokenPayload(jwt.verify(token, process.env.JWT_SECRET));
  const userId = Number(decodedUser.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid user');
  }

  const pool = await getConnection();
  const user = await getUserById(pool, userId);

  if (!user || !mapPublicUser(user).is_active) {
    throw new Error('Invalid or inactive user');
  }

  return mapSessionUser(user);
};

const setUserPresence = async (userId, isOnline) => {
  const pool = await getConnection();
  const presenceColumn = await getPresenceColumn(pool);

  if (!presenceColumn) {
    return;
  }

  await pool
    .request()
    .input('UserId', sql.Int, Number(userId))
    .input('IsOnline', sql.Bit, isOnline ? 1 : 0)
    .query(`
      UPDATE Users
      SET ${presenceColumn} = @IsOnline
      WHERE id = @UserId
    `);
};

const resetAllUserPresence = async () => {
  userSockets.clear();
  userPresenceVersions.clear();

  const pool = await getConnection();
  const presenceColumn = await getPresenceColumn(pool);

  if (!presenceColumn) {
    return;
  }

  await pool
    .request()
    .query(`
      UPDATE Users
      SET ${presenceColumn} = 0
    `);
};

const registerUserSocket = async (userId, socketId) => {
  if (!userId || !socketId) {
    return;
  }

  const normalizedUserId = Number(userId);

  if (!userSockets.has(normalizedUserId)) {
    userSockets.set(normalizedUserId, new Set());
  }

  userSockets.get(normalizedUserId).add(socketId);

  bumpPresenceVersion(normalizedUserId);
  await setUserPresence(normalizedUserId, true);
};

const unregisterUserSocket = async (userId, socketId) => {
  if (!userId || !socketId) {
    return;
  }

  const normalizedUserId = Number(userId);
  const sockets = userSockets.get(normalizedUserId);

  if (!sockets) {
    const version = bumpPresenceVersion(normalizedUserId);
    await setUserPresenceIfCurrent(normalizedUserId, false, version);
    return;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    userSockets.delete(normalizedUserId);
    const version = bumpPresenceVersion(normalizedUserId);
    await setUserPresenceIfCurrent(normalizedUserId, false, version);
  }
};

module.exports = {
  getSocketUser,
  setUserPresence,
  resetAllUserPresence,
  registerUserSocket,
  unregisterUserSocket
};
