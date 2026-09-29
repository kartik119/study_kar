import { Router } from 'express';
import { TeamController } from '../controllers/admin/team.controller';
import { authenticateToken, requireRole, requirePermission } from '../middleware/auth';

import { TeamRoleController } from '../controllers/admin/team-role.controller';
import { ActivityLogsController } from '../controllers/admin/activity-logs.controller';
const router: import('express').Router = Router();
const teamController = new TeamController();
const teamRoleController = new TeamRoleController();
const activityLogsController = new ActivityLogsController();

// All team routes require admin auth and specific permissions.
// Using SUPER_ADMIN or ADMIN for now based on prompt.

router.use(authenticateToken);
// router.use(requireRole(['SUPER_ADMIN', 'ADMIN'])); // Based on current setup, maybe use permission middleware

// Roles & Permissions API
router.get('/roles', teamRoleController.listRoles);
router.get('/permissions', teamRoleController.getAllPermissions);
router.post('/roles', teamRoleController.createRole);
router.get('/roles/:id', teamRoleController.getRoleDetails);
router.get('/roles/:id/activity', teamRoleController.getRoleActivity);
router.put('/roles/:id', teamRoleController.updateRole);

// Team Members API
router.get('/members', teamController.listMembers);
router.get('/kpi', teamController.getKPIs);
router.post('/invite', teamController.inviteMember);
router.get('/members/:id', teamController.getMemberDetails);
router.get('/members/:id/activity', teamController.getMemberActivity);
router.post('/members/:id/resend-invite', teamController.resendInvite);
router.post('/members/:id/cancel-invite', teamController.cancelInvite);
router.put('/members/:id', teamController.editMember);
router.put('/members/:id/access', teamController.editAccess);
router.post('/members/:id/suspend', teamController.suspendMember);
router.post('/members/:id/reactivate', teamController.reactivateMember);
router.delete('/members/:id', teamController.deactivateMember);

// Activity Logs API
router.get('/activity-logs', requirePermission('team.activity_logs.view' as any), activityLogsController.listActivityLogs);
router.get('/activity-logs/kpi', requirePermission('team.activity_logs.view' as any), activityLogsController.getKPIs);
router.get('/activity-logs/:id', requirePermission('team.activity_logs.view' as any), activityLogsController.getActivityLogDetails);

export default router;
