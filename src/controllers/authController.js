const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getConnection } = require('../config/db');
const {
  createGoogleUser,
  createLocalUser,
  getUserByEmail,
  getUserById,
  linkGoogleUser,
  touchLastLogin
} = require('../services/userService');
const {
  DEFAULT_ROLE,
  getTokenPayload,
  mapPublicUser,
  mapSessionUser
} = require('../utils/userUtils');

const getAuthEmail = (body = {}) => {
  const value = body.email !== undefined ? body.email : body.correo;
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
};

const getAuthName = (body = {}) => {
  const value = body.name !== undefined ? body.name : body.nombre;
  return typeof value === 'string' ? value.trim() : '';
};

const getCleanPassword = (password) => {
  return typeof password === 'string' ? password.trim() : '';
};

const createToken = (user) => {
  return jwt.sign(
    getTokenPayload(user),
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const sendAuthResponse = async (res, pool, user) => {
  const sessionUser = mapSessionUser(user);

  await touchLastLogin(pool, sessionUser.id);

  return res.status(200).json({
    token: createToken(user),
    user: sessionUser
  });
};

const home = (req, res) => {
  return res.status(200).json({
    status: 200,
    message: 'Server is running'
  });
};

const register = async (req, res) => {
  try {
    const cleanName = getAuthName(req.body);
    const cleanEmail = getAuthEmail(req.body);
    const cleanPassword = getCleanPassword(req.body.password);

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({
        status: 400,
        message: 'Name, email and password are required'
      });
    }

    const pool = await getConnection();
    const existingUser = await getUserByEmail(pool, cleanEmail);

    if (existingUser) {
      return res.status(409).json({
        status: 409,
        message: 'Email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const user = await createLocalUser(pool, {
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: DEFAULT_ROLE
    });

    return res.status(201).json({
      status: 201,
      message: 'User registered successfully',
      user: mapPublicUser(user)
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        status: 409,
        message: 'Email already exists'
      });
    }

    return res.status(500).json({
      status: 500,
      message: 'Error registering user',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const cleanEmail = getAuthEmail(req.body);
    const cleanPassword = getCleanPassword(req.body.password);

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        status: 400,
        message: 'Email and password are required'
      });
    }

    const pool = await getConnection();
    const user = await getUserByEmail(pool, cleanEmail, { includePassword: true });

    if (!user || !user.password_hash) {
      return res.status(401).json({
        status: 401,
        message: 'Credenciales invalidas'
      });
    }

    const isPasswordValid = await bcrypt.compare(cleanPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 401,
        message: 'Credenciales invalidas'
      });
    }

    if (!mapPublicUser(user).is_active) {
      return res.status(403).json({
        status: 403,
        message: 'User is inactive'
      });
    }

    return sendAuthResponse(res, pool, user);
  } catch (error) {
    console.error('[auth] Login failed:', error.message);

    return res.status(500).json({
      status: 500,
      message: 'Error interno del servidor'
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({
        status: 503,
        message: 'Google login is not configured'
      });
    }

    const credential = typeof req.body.credential === 'string'
      ? req.body.credential.trim()
      : '';

    if (!credential) {
      return res.status(400).json({
        status: 400,
        message: 'Google credential is required'
      });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.email || payload.email_verified !== true) {
      return res.status(401).json({
        status: 401,
        message: 'Google email is not verified'
      });
    }

    if (
      process.env.GOOGLE_ALLOWED_DOMAIN &&
      payload.hd !== process.env.GOOGLE_ALLOWED_DOMAIN
    ) {
      return res.status(403).json({
        status: 403,
        message: 'Google account domain is not allowed'
      });
    }

    const pool = await getConnection();
    const email = payload.email.trim().toLowerCase();
    const name = payload.name || email.split('@')[0];
    let user = await getUserByEmail(pool, email);

    if (user && !mapPublicUser(user).is_active) {
      return res.status(403).json({
        status: 403,
        message: 'User is inactive'
      });
    }

    if (user?.google_id && user.google_id !== payload.sub) {
      return res.status(403).json({
        status: 403,
        message: 'Google account is not linked to this user'
      });
    }

    if (user) {
      user = await linkGoogleUser(pool, user.id, payload.sub);
    } else {
      user = await createGoogleUser(pool, {
        name,
        email,
        googleId: payload.sub
      });
    }

    return sendAuthResponse(res, pool, user);
  } catch (error) {
    console.error('[auth] Google login failed:', error.message);

    if (error.message.includes('Google user schema is not ready')) {
      return res.status(500).json({
        status: 500,
        message: error.message
      });
    }

    return res.status(401).json({
      status: 401,
      message: 'Invalid Google credential'
    });
  }
};

const logout = async (req, res) => {
  return res.status(200).json({
    status: 200,
    message: 'Logout successfully'
  });
};

const profile = async (req, res) => {
  try {
    const pool = await getConnection();
    const user = await getUserById(pool, req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found'
      });
    }

    if (!mapPublicUser(user).is_active) {
      return res.status(403).json({
        status: 403,
        message: 'User is inactive'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Profile data',
      user: mapSessionUser(user)
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error getting profile',
      error: error.message
    });
  }
};

module.exports = {
  home,
  register,
  login,
  googleLogin,
  logout,
  profile
};
