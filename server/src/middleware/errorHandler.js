export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada.' });
}

export function errorHandler(error, req, res, _next) {
  const status = Number(error?.status) || 500;
  const body = {
    error: error?.code || 'INTERNAL_ERROR',
    message: status >= 500 ? 'Error interno del servidor.' : error.message,
  };
  if (process.env.NODE_ENV !== 'production' && status >= 500) body.detail = error.message;
  res.status(status).json(body);
}
