// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { PermissionKey } from '@study-karnataka/shared-types';
import { prisma } from '@study-karnataka/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    accountType: string;
    roles?: string[];
    permissions?: PermissionKey[];
    sessionId: string;
  };
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    res.status(401).json(sendError('UNAUTHENTICATED', 'Authentication required. Access token missing.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    
    // Check if session still exists in DB
    const session = await prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      include: { adminUser: true }
    });

    if (!session || !session.adminUser || session.adminUser.accountStatus !== 'ACTIVE') {
      res.status(401).json(sendError('UNAUTHENTICATED', 'Session invalidated or account deactivated.'));
      return;
    }

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json(sendError('SESSION_EXPIRED', 'Access token has expired. Please refresh session.'));
      return;
    }
    res.status(401).json(sendError('UNAUTHENTICATED', 'Invalid access token.'));
  }
}

export function requirePermission(...requiredPermissions: PermissionKey[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(sendError('UNAUTHENTICATED', 'Authentication required.'));
      return;
    }

    const userPermissions = req.user.permissions?.length ? req.user.permissions : [];
    const userRoles = req.user.roles?.length ? req.user.roles : ['Super Admin'];
    const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasPermission && !userRoles.includes('Super Admin')) {
      res.status(403).json(sendError('FORBIDDEN', `Forbidden. Required permission: ${requiredPermissions.join(', ')}`));
      return;
    }

    next();
  };
}

export function requireRole(...requiredRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(sendError('UNAUTHENTICATED', 'Authentication required.'));
      return;
    }

    const userRoles = req.user.roles?.length ? req.user.roles : ['Super Admin'];
    const hasRole = requiredRoles.some((r) => userRoles.includes(r));

    if (!hasRole && !userRoles.includes('Super Admin')) {
      res.status(403).json(sendError('FORBIDDEN', `Forbidden. Access limited to roles: ${requiredRoles.join(', ')}`));
      return;
    }

    next();
  };
}
