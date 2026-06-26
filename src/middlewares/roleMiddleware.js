const {
  isAdmin,
  isSupportRole,
  normalizeRole
} = require('../utils/userUtils');

const requireRole = (...roles) => {
  const allowedRoles = roles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        message: 'Authentication is required'
      });
    }

    if (!allowedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({
        status: 403,
        message: 'You do not have permission to perform this action'
      });
    }

    return next();
  };
};

module.exports = {
  requireRole,
  isSupportRole,
  isAdmin
};
