const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getConnection } = require('../config/db');
const {
  createGoogleUser,
  createLocalUser,
  getUserByGoogleId,
  getUserByEmail,
  getUserById,
  linkGoogleUser,
  touchLastLogin
} = require('../services/userService');
const {
  DEFAULT_ROLE,
  getRoleForStorage,
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

const getEnvList = (name) => {
  return typeof process.env[name] === 'string'
    ? process.env[name]
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    : [];
};

const getCleanEnv = (name) => {
  return typeof process.env[name] === 'string'
    ? process.env[name].trim()
    : '';
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

const getEmailDomain = (email) => {
  const parts = String(email || '').split('@');
  return parts.length === 2 ? parts[1].trim().toLowerCase() : '';
};

const getGoogleRoleForNewUser = (email) => {
  const adminEmails = getEnvList('GOOGLE_ADMIN_EMAILS');

  if (adminEmails.includes(email)) {
    return 'admin';
  }

  const defaultRole = getCleanEnv('GOOGLE_DEFAULT_ROLE') || DEFAULT_ROLE;
  return getRoleForStorage(defaultRole);
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
    const credential = typeof req.body?.credential === 'string'
      ? req.body.credential.trim()
      : '';

    if (!credential) {
      return res.status(400).json({
        status: 400,
        message: 'Google credential is required'
      });
    }

    const googleClientId = getCleanEnv('GOOGLE_CLIENT_ID');

    if (!googleClientId) {
      return res.status(503).json({
        status: 503,
        message: 'Google OAuth no está configurado'
      });
    }

    const client = new OAuth2Client(googleClientId);
    let ticket;

    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId
      });
    } catch (error) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid Google credential'
      });
    }

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email || payload.email_verified !== true) {
      return res.status(401).json({
        status: 401,
        message: 'Google email is not verified'
      });
    }

    const email = payload.email.trim().toLowerCase();
    const allowedEmails = getEnvList('GOOGLE_ALLOWED_EMAILS');

    if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
      return res.status(403).json({
        status: 403,
        message: 'Google account email is not allowed'
      });
    }

    const allowedDomain = getCleanEnv('GOOGLE_ALLOWED_DOMAIN').toLowerCase();
    const hostedDomain = typeof payload.hd === 'string'
      ? payload.hd.trim().toLowerCase()
      : '';
    const emailDomain = getEmailDomain(email);

    if (allowedDomain && hostedDomain !== allowedDomain && emailDomain !== allowedDomain) {
      return res.status(403).json({
        status: 403,
        message: 'Google account domain is not allowed'
      });
    }

    const newUserRole = getGoogleRoleForNewUser(email);

    if (!newUserRole) {
      return res.status(503).json({
        status: 503,
        message: 'Google default role is not valid'
      });
    }

    const pool = await getConnection();
    const name = payload.name || email.split('@')[0];
    let user = await getUserByGoogleId(pool, payload.sub);

    if (!user) {
      user = await getUserByEmail(pool, email);
    }

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
        googleId: payload.sub,
        role: newUserRole
      });
    }

    return sendAuthResponse(res, pool, user);
  } catch (error) {
    console.error('[auth] Google login failed:', error.message);

    if (error.message.includes('Google user schema is not ready')) {
      return res.status(503).json({
        status: 503,
        message: error.message
      });
    }

    return res.status(500).json({
      status: 500,
      message: 'Error interno del servidor'
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
