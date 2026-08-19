export function toPublicUser(user) {
  if (!user) return null;
  const { id, username, email, displayName, status, createdAt, updatedAt, lastLoginAt } = user;
  return Object.fromEntries(
    Object.entries({ id, username, email, displayName, status, createdAt, updatedAt, lastLoginAt })
      .filter(([, value]) => value !== undefined)
  );
}
