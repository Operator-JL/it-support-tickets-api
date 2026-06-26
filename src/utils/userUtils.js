const DEFAULT_ROLE = 'usuario';
const VALID_ROLES = ['admin', 'soporte', 'usuario'];

const ROLE_ALIASES = {
  admin: 'admin',
  soporte: 'soporte',
  support: 'soporte',
  it: 'soporte',
  tecnico: 'soporte',
  tecnico_it: 'soporte',
  usuario: 'usuario',
  user: 'usuario'
};

const normalizeRole = (role) => {
  const cleanRole = typeof role === 'string'
    ? role.trim().toLowerCase()
    : '';

  return ROLE_ALIASES[cleanRole] || DEFAULT_ROLE;
};

const getRoleForStorage = (role) => {
  const cleanRole = typeof role === 'string'
    ? role.trim().toLowerCase()
    : '';
  const normalizedRole = ROLE_ALIASES[cleanRole];

  return VALID_ROLES.includes(normalizedRole) ? normalizedRole : null;
};

const isAdmin = (user) => {
  return normalizeRole(user?.role) === 'admin';
};

const isSupportRole = (user) => {
  return ['admin', 'soporte'].includes(normalizeRole(user?.role));
};

const getUserId = (user) => {
  return user?.id || user?.Id;
};

const getUserName = (user) => {
  return user?.name || user?.Name || user?.nombre || user?.Nombre;
};

const getUserEmail = (user) => {
  return user?.email || user?.Email || user?.correo || user?.Correo;
};

const mapPublicUser = (user = {}) => {
  const id = getUserId(user);
  const name = getUserName(user);
  const email = getUserEmail(user);

  return {
    id,
    name,
    email,
    role: normalizeRole(user.role || user.Role),
    is_active: user.is_active !== undefined ? Boolean(user.is_active) : true,
    is_online: user.is_online !== undefined ? Boolean(user.is_online) : false,
    provider: user.provider || user.Provider || 'local',
    created_at: user.created_at || user.CreatedAt || null,
    updated_at: user.updated_at || user.UpdatedAt || null,
    last_login_at: user.last_login_at || user.LastLoginAt || null
  };
};

const mapSessionUser = (user = {}) => {
  const publicUser = mapPublicUser(user);

  return {
    id: publicUser.id,
    name: publicUser.name,
    email: publicUser.email,
    role: publicUser.role,
    provider: publicUser.provider
  };
};

const getTokenPayload = (user = {}) => {
  const sessionUser = mapSessionUser(user);

  return {
    id: sessionUser.id,
    name: sessionUser.name,
    nombre: sessionUser.name,
    email: sessionUser.email,
    correo: sessionUser.email,
    role: sessionUser.role
  };
};

module.exports = {
  DEFAULT_ROLE,
  VALID_ROLES,
  getRoleForStorage,
  getTokenPayload,
  mapPublicUser,
  mapSessionUser,
  normalizeRole,
  isAdmin,
  isSupportRole
};
