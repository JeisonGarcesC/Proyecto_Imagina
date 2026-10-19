import { Router, raw } from 'express';
import { createAuthenticateAccessToken } from '../middleware/authenticateAccessToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requestAuditContext } from '../audit/auditService.js';
import { readTexture, MAX_TEXTURE_BYTES } from './textureStorage.js';
import { archiveSpecialFinish, createSpecialFinish, getSpecialFinish,
  getSpecialFinishTexture, listSpecialFinishes, uploadSpecialFinishTexture } from './specialFinishService.js';

function handle(operation, status = 200) {
  return async (req, res, next) => {
    try { res.status(status).json(await operation(req)); } catch (error) { next(error); }
  };
}

export function createSpecialFinishRouter({ db, tokenOptions } = {}) {
  const router = Router();
  router.use(createAuthenticateAccessToken({ db, tokenOptions }));
  router.get('/', requirePermission('finishes.view'), handle((req) => listSpecialFinishes(db, req.query)));
  router.post('/textures', requirePermission('finishes.create'),
    raw({ type: () => true, limit: MAX_TEXTURE_BYTES + 1 }),
    handle((req) => uploadSpecialFinishTexture(db, req.body, req.get('content-type'),
      req.get('x-file-name'), req.auth), 201));
  router.get('/textures/:id', requirePermission('finishes.view'), async (req, res, next) => {
    try {
      const asset = await getSpecialFinishTexture(db, req.params.id);
      const bytes = await readTexture(asset.storageKey);
      res.set({ 'Content-Type': asset.mimeType, 'Content-Length': String(bytes.length),
        'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600' });
      res.end(bytes);
    } catch (error) { next(error); }
  });
  router.post('/', requirePermission('finishes.create'), handle((req) =>
    createSpecialFinish(db, req.body, req.auth, requestAuditContext(req)), 201));
  router.get('/:id', requirePermission('finishes.view'), handle((req) => getSpecialFinish(db, req.params.id)));
  router.delete('/:id', requirePermission('finishes.delete'), handle((req) =>
    archiveSpecialFinish(db, req.params.id, req.auth, requestAuditContext(req))));
  return router;
}
