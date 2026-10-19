import { Router } from 'express';
import { createAuthenticateAccessToken } from '../middleware/authenticateAccessToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requestAuditContext } from '../audit/auditService.js';
import { getAdminAudit, listAdminAudit } from './adminAuditService.js';
import { getUserPermissions, setUserPermissionOverrides } from './adminUserPermissionsService.js';
import { getAdminDevice, listAdminDevices, listAdminSessions, revokeAdminDevice, revokeAdminSession } from './adminDeviceSessionService.js';
import {
  createUser, getRole, getUser, listPermissions, listRoles, listUsers,
  normalizeAdminError, resetPassword, setRolePermissions, setUserRoles, setUserStatus, updateUser,
} from './adminService.js';

function handle(operation) {
  return async (req, res, next) => {
    try {
      const result = await operation(req);
      res.status(result?.created ? 201 : 200).json(result?.created ? result.user : result);
    } catch (error) {
      next(normalizeAdminError(error));
    }
  };
}

export function createAdminRouter({ db, tokenOptions }) {
  const router = Router();
  router.use(createAuthenticateAccessToken({ db, tokenOptions }));
  const context = (req) => requestAuditContext(req);

  router.get('/audit', requirePermission('admin.audit.read'), handle((req) => listAdminAudit(db, req.query)));
  router.get('/audit/:id', requirePermission('admin.audit.read'), handle((req) => getAdminAudit(db, req.params.id)));

  router.get('/users', requirePermission('admin.users.read'), handle((req) => listUsers(db, req.query)));
  router.get('/users/:id', requirePermission('admin.users.read'), handle((req) => getUser(db, req.params.id)));
  router.get('/users/:id/permissions', requirePermission('admin.users.read'), handle((req) => getUserPermissions(db, req.params.id)));
  router.put('/users/:id/permissions', requirePermission('admin.permissions.write'), handle((req) =>
    setUserPermissionOverrides(db, req.params.id, req.body, req.auth, context(req))));
  router.post('/users', requirePermission('admin.users.write'), handle(async (req) => ({
    created: true, user: await createUser(db, req.body, req.auth, context(req)),
  })));
  router.patch('/users/:id', requirePermission('admin.users.write'), handle((req) =>
    updateUser(db, req.params.id, req.body, req.auth, context(req))));
  router.patch('/users/:id/status', requirePermission('admin.users.write'), handle((req) =>
    setUserStatus(db, req.params.id, req.body, req.auth, context(req))));
  router.post('/users/:id/password', requirePermission('admin.users.write'), handle((req) =>
    resetPassword(db, req.params.id, req.body, req.auth, context(req))));
  router.put('/users/:id/roles', requirePermission('admin.roles.write'), handle((req) =>
    setUserRoles(db, req.params.id, req.body, req.auth, context(req))));
  router.get('/roles', requirePermission('admin.roles.read'), handle(() => listRoles(db)));
  router.get('/roles/:id', requirePermission('admin.roles.read'), handle((req) => getRole(db, req.params.id)));
  router.put('/roles/:id/permissions', requirePermission('admin.roles.write'), handle((req) =>
    setRolePermissions(db, req.params.id, req.body, req.auth, context(req))));
  router.get('/permissions', requirePermission('admin.roles.read'), handle(() => listPermissions(db)));
  router.get('/devices', requirePermission('admin.devices.read'), handle((req) => listAdminDevices(db, req.query)));
  router.get('/devices/:id', requirePermission('admin.devices.read'), handle((req) => getAdminDevice(db, req.params.id)));
  router.post('/devices/:id/revoke', requirePermission('admin.devices.revoke'), handle((req) =>
    revokeAdminDevice(db, req.params.id, req.auth, context(req))));
  router.get('/sessions', requirePermission('admin.devices.read'), handle((req) => listAdminSessions(db, req.query)));
  router.post('/sessions/:id/revoke', requirePermission('admin.devices.revoke'), handle((req) =>
    revokeAdminSession(db, req.params.id, req.auth, context(req))));
  return router;
}
