const jwt = require('jsonwebtoken');

const normalizeRole = (role) => {
  return typeof role === 'string' ? role.toLowerCase() : 'user';
};

const authMiddleware = (req, res, next) => {
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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id || decoded.Id,
      name: decoded.name || decoded.Name,
      email: decoded.email || decoded.Email,
      role: normalizeRole(decoded.role || decoded.Role)
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      status: 401,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authMiddleware;
