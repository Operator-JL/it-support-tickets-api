const SUPPORT_ROLES = ['it', 'admin'];

const isSupportRole = (user) => {
  return SUPPORT_ROLES.includes(user?.role);
};

const isAdmin = (user) => {
  return user?.role === 'admin';
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        message: 'Authentication is required'
      });
    }

    if (!roles.includes(req.user.role)) {
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
