// @ts-nocheck
import { Router, Request, Response } from 'express';
import { prisma } from '@study-karnataka/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../utils/jwt';
import { hashToken } from '../utils/crypto';
import { sendSuccess, sendError } from '../utils/response';
import { serializeStudent } from '../utils/serializer';
import { PermissionKey } from '@study-karnataka/shared-types';

const router: Router = Router();

// 1. POST /api/v1/auth/refresh
router.post('/auth/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshTokenRaw = req.body.refreshToken || req.cookies?.refresh_token;

    if (!refreshTokenRaw) {
      res.status(401).json(sendError('UNAUTHENTICATED', 'Refresh token is required'));
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenRaw);
    } catch {
      res.status(401).json(sendError('SESSION_EXPIRED', 'Invalid or expired refresh token'));
      return;
    }

    const refreshTokenHash = hashToken(refreshTokenRaw);

    const session = await prisma.userSession.findFirst({
      where: {
        id: payload.sessionId,
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      res.status(401).json(sendError('SESSION_REVOKED', 'Session has been revoked or expired'));
      return;
    }

    // Refresh Token Rotation: issue new access & refresh tokens
    const newRefreshTokenRaw = signRefreshToken({
      userId: payload.userId,
      accountType: payload.accountType,
      roles: payload.roles,
      permissions: payload.permissions,
      sessionId: session.id,
    });
    const newRefreshTokenHash = hashToken(newRefreshTokenRaw);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: new Date(),
        expiresAt: newExpiresAt,
      },
    });

    const newAccessToken = signAccessToken({
      userId: payload.userId,
      accountType: payload.accountType,
      roles: payload.roles,
      permissions: payload.permissions,
      sessionId: session.id,
    });

    res.cookie('refresh_token', newRefreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(
      sendSuccess(
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshTokenRaw,
          expiresIn: 900,
        },
        'Token refreshed successfully'
      )
    );
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Refresh token failed'));
  }
});

// 2. POST /api/v1/auth/logout
router.post('/auth/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.sessionId) {
      await prisma.userSession.updateMany({
        where: { id: req.user.sessionId },
        data: { revokedAt: new Date(), revokeReason: 'User logout' },
      });
    }

    res.clearCookie('refresh_token');
    res.clearCookie('access_token');

    res.status(200).json(sendSuccess(null, 'Logged out successfully'));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Logout failed'));
  }
});

// 3. POST /api/v1/auth/logout-all
router.post('/auth/logout-all', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.userId) {
      const isAdmin = req.user.accountType === 'ADMIN';
      await prisma.userSession.updateMany({
        where: isAdmin ? { adminUserId: req.user.userId, revokedAt: null } : { userId: req.user.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'Logout from all devices' },
      });
    }

    res.clearCookie('refresh_token');
    res.clearCookie('access_token');

    res.status(200).json(sendSuccess(null, 'Logged out from all devices successfully'));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Logout all failed'));
  }
});

// 4. GET /api/v1/auth/me
router.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.accountType === 'ADMIN') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: req.user.userId },
        include: {
          adminRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      });

      if (!admin) {
        res.status(404).json(sendError('UNAUTHENTICATED', 'Admin user not found'));
        return;
      }

      const roleNames = admin.adminRoles.map((ar) => ar.role.name);
      const permSet = new Set<PermissionKey>();
      admin.adminRoles.forEach((ar) => {
        ar.role.rolePermissions.forEach((rp) => permSet.add(rp.permission.code as PermissionKey));
      });

      res.status(200).json(
        sendSuccess({
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName,
          accountType: 'ADMIN',
          accountStatus: admin.accountStatus,
          roles: roleNames,
          permissions: Array.from(permSet),
        })
      );
      return;
    }

    // Student User
    const student = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: {
        studentProfile: true,
        guardianConsents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!student) {
      res.status(404).json(sendError('UNAUTHENTICATED', 'Student user not found'));
      return;
    }

    const serialized = serializeStudent(student, req.user?.permissions || [], true);
    res.status(200).json(sendSuccess(serialized));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to fetch user profile'));
  }
});

// 5. GET /api/v1/auth/sessions
router.get('/auth/sessions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.accountType === 'ADMIN';
    const sessions = await prisma.userSession.findMany({
      where: isAdmin
        ? { adminUserId: req.user?.userId, revokedAt: null, expiresAt: { gt: new Date() } }
        : { userId: req.user?.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        platform: true,
        deviceId: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    res.status(200).json(
      sendSuccess(
        sessions.map((s) => ({
          ...s,
          isCurrentSession: s.id === req.user?.sessionId,
        }))
      )
    );
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to fetch sessions'));
  }
});

// 6. DELETE /api/v1/auth/sessions/:sessionId
router.delete('/auth/sessions/:sessionId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.params.sessionId;
    const targetSessionId = Array.isArray(rawId) ? rawId[0] : rawId;
    const isAdmin = req.user?.accountType === 'ADMIN';

    const session = await prisma.userSession.findFirst({
      where: isAdmin
        ? { id: targetSessionId, adminUserId: req.user?.userId }
        : { id: targetSessionId, userId: req.user?.userId },
    });

    if (!session) {
      res.status(404).json(sendError('NOT_FOUND', 'Session not found or unauthorized'));
      return;
    }

    await prisma.userSession.update({
      where: { id: targetSessionId },
      data: { revokedAt: new Date(), revokeReason: 'User revoked session' },
    });

    res.status(200).json(sendSuccess(null, 'Session revoked successfully'));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to revoke session'));
  }
});

export default router;
