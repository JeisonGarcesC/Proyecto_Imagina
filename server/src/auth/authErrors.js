export function authError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export const invalidCredentialsError = () => authError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
