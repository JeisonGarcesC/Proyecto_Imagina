import process from 'node:process';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada.' });
}

export function errorHandler(error, req, res, _next) {
  void _next;
  const status = Number(error?.status) || 500;
  const textureTooLarge = status === 413 && error?.type === 'entity.too.large'
    && req.path === '/special-finishes/textures';
  const body = {
    error: textureTooLarge ? 'TEXTURE_TOO_LARGE' : error?.code || 'INTERNAL_ERROR',
    message: textureTooLarge ? 'La imagen supera 5 MiB.'
      : status >= 500 ? 'Error interno del servidor.' : error.message,
  };
  if (process.env.NODE_ENV !== 'production' && status >= 500) body.detail = error.message;
  res.status(status).json(body);
}
