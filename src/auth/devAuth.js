const DEV_USERS = Object.freeze({
  admin: Object.freeze({
    username: 'admin',
    password: 'admin123',
    role: 'administrador',
    label: 'Administrador',
  }),
  diseno: Object.freeze({
    username: 'diseno',
    password: 'diseno123',
    role: 'diseno',
    label: 'Diseño',
  }),
  comercial: Object.freeze({
    username: 'comercial',
    password: 'comercial123',
    role: 'comercial',
    label: 'Comercial',
  }),
});

const DEV_FINISH_PERMISSIONS = Object.freeze({
  administrador: Object.freeze(['finishes.view', 'finishes.apply', 'finishes.create', 'finishes.delete']),
  diseno: Object.freeze(['finishes.view', 'finishes.apply', 'finishes.create', 'finishes.delete']),
  comercial: Object.freeze(['finishes.view', 'finishes.apply', 'finishes.create']),
});

export const DEV_USER_OPTIONS = Object.freeze(
  Object.values(DEV_USERS).map(({ username, label }) => Object.freeze({ username, label }))
);

export function createDevSession(username) {
  const devUser = DEV_USERS[String(username || '').trim().toLowerCase()];
  if (!devUser) return null;

  return {
    user: {
      id: `dev-${devUser.username}`,
      username: devUser.username,
      displayName: devUser.label,
      status: 'ACTIVE',
    },
    roles: [devUser.role],
    permissions: [...(DEV_FINISH_PERMISSIONS[devUser.role] || [])],
  };
}
