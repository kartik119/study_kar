import { Router, Request, Response } from 'express';
import { prisma } from '@study-karnataka/database';
import { AdminLoginSchema } from '@study-karnataka/validation';
import { comparePassword, hashToken } from '../utils/crypto';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { PermissionKey } from '@study-karnataka/shared-types';

const router: Router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// POST /api/v1/auth/admin/login
router.post('/auth/admin/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = AdminLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(sendError('INVALID_CREDENTIALS', 'Invalid email or password format.', parseResult.error.flatten()));
      return;
    }

    const { email, password } = parseResult.data;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    const now = new Date();

    const adminUser = await prisma.adminUser.findUnique({
      where: { email },
      include: {
        adminRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!adminUser) {
      res.status(401).json(sendError('INVALID_CREDENTIALS', 'Invalid email or password.'));
      return;
    }

    if (adminUser.lockedUntil && adminUser.lockedUntil > now) {
      const minutesLeft = Math.ceil((adminUser.lockedUntil.getTime() - now.getTime()) / (60 * 1000));
      res.status(423).json(
        sendError('ACCOUNT_LOCKED', `Account is temporarily locked due to multiple failed login attempts. Try again in ${minutesLeft} minutes.`)
      );
      return;
    }

    const isMatch = await comparePassword(password, adminUser.passwordHash);

    if (!isMatch) {
      const newFailedCount = adminUser.failedLoginCount + 1;
      let lockedUntil: Date | null = null;

      if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
      }

      await prisma.adminUser.update({
        where: { id: adminUser.id },
        data: {
          failedLoginCount: newFailedCount,
          lockedUntil,
        },
      });

      await prisma.adminAuditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: 'LOGIN_FAILURE',
          module: 'AUTH',
          reason: lockedUntil ? 'Account locked after 5 failed attempts' : 'Invalid password',
          ipAddress,
          userAgent,
        },
      });

      res.status(401).json(sendError('INVALID_CREDENTIALS', 'Invalid email or password.'));
      return;
    }

    await prisma.adminUser.update({
      where: { id: adminUser.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    const roleNames = adminUser.adminRoles.map((ar) => ar.role.name);
    const permissionCodesSet = new Set<PermissionKey>();

    adminUser.adminRoles.forEach((ar) => {
      ar.role.rolePermissions.forEach((rp) => {
        permissionCodesSet.add(rp.permission.code as PermissionKey);
      });
    });

    const permissions = Array.from(permissionCodesSet);

    // Dummy session ID to sign initial JWT refresh token
    const dummySessionId = `session_${Date.now()}`;
    const refreshTokenJWT = signRefreshToken({
      userId: adminUser.id,
      accountType: 'ADMIN',
      roles: roleNames,
      permissions,
      sessionId: dummySessionId,
    });
    const refreshTokenHash = hashToken(refreshTokenJWT);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.userSession.create({
      data: {
        adminUserId: adminUser.id,
        refreshTokenHash,
        platform: 'ADMIN_WEB',
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    // Re-sign token with actual session ID
    const refreshToken = signRefreshToken({
      userId: adminUser.id,
      accountType: 'ADMIN',
      roles: roleNames,
      permissions,
      sessionId: session.id,
    });

    await prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    const accessToken = signAccessToken({
      userId: adminUser.id,
      accountType: 'ADMIN',
      roles: roleNames,
      permissions,
      sessionId: session.id,
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: adminUser.id,
        action: 'LOGIN_SUCCESS',
        module: 'AUTH',
        ipAddress,
        userAgent,
      },
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(
      sendSuccess(
        {
          user: {
            id: adminUser.id,
            email: adminUser.email,
            fullName: adminUser.fullName,
            accountStatus: adminUser.accountStatus,
            roles: roleNames,
            permissions,
          },
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
        'Admin authenticated successfully.'
      )
    );
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Admin login failed'));
  }
});

export default router;
