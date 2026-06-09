const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sql, getConnection } = require('../config/db');

const DEFAULT_ROLE = 'user';

const getUserRole = (user) => {
  const role = user.Role || user.role || DEFAULT_ROLE;
  return typeof role === 'string' ? role.toLowerCase() : DEFAULT_ROLE;
};

const mapUser = (user) => {
  return {
    id: user.Id || user.id,
    name: user.Name || user.name,
    email: user.Email || user.email,
    role: getUserRole(user)
  };
};

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.Id || user.id,
      name: user.Name || user.name,
      email: user.Email || user.email,
      role: getUserRole(user)
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const home = (req, res) => {
  return res.status(200).json({
    status: 200,
    message: 'Server is running'
  });
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (name === undefined || email === undefined || password === undefined) {
      return res.status(400).json({
        status: 400,
        message: 'Name, email and password are required'
      });
    }

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        status: 400,
        message: 'Name, email and password must be text'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      return res.status(400).json({
        status: 400,
        message: 'Name, email and password cannot be empty'
      });
    }

    const pool = await getConnection();

    const existingUser = await pool
      .request()
      .input('Email', sql.NVarChar(150), cleanEmail)
      .query('SELECT Id FROM Users WHERE Email = @Email');

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        status: 409,
        message: 'Email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);

    const result = await pool
      .request()
      .input('Name', sql.NVarChar(100), cleanName)
      .input('Email', sql.NVarChar(150), cleanEmail)
      .input('PasswordHash', sql.NVarChar(255), passwordHash)
      .input('Role', sql.NVarChar(20), DEFAULT_ROLE)
      .query(`
        INSERT INTO Users (Name, Email, PasswordHash, Role)
        OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Email, INSERTED.Role
        VALUES (@Name, @Email, @PasswordHash, @Role)
      `);

    const user = result.recordset[0];

    return res.status(201).json({
      status: 201,
      message: 'User registered successfully',
      user: mapUser(user)
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
    const { email, password } = req.body;

    if (email === undefined || password === undefined) {
      return res.status(400).json({
        status: 400,
        message: 'Email and password are required'
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        status: 400,
        message: 'Email and password must be text'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return res.status(400).json({
        status: 400,
        message: 'Email and password cannot be empty'
      });
    }

    const pool = await getConnection();

    const result = await pool
      .request()
      .input('Email', sql.NVarChar(150), cleanEmail)
      .query('SELECT Id, Name, Email, PasswordHash, Role FROM Users WHERE Email = @Email');

    if (result.recordset.length === 0) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid credentials'
      });
    }

    const user = result.recordset[0];
    const isPasswordValid = await bcrypt.compare(cleanPassword, user.PasswordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid credentials'
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      status: 200,
      message: 'Login successfully',
      user: mapUser(user),
      token
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Error logging in',
      error: error.message
    });
  }
};

const profile = (req, res) => {
  return res.status(200).json({
    status: 200,
    message: 'Profile data',
    user: req.user
  });
};

module.exports = {
  home,
  register,
  login,
  profile
};
