export function parseAdminPagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw Object.assign(new Error('Paginación inválida.'), { status: 400, code: 'INVALID_PAGINATION' });
  }
  return { page, pageSize };
}
