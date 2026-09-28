import { Request, Response } from 'express';
import { prisma } from '@study-karnataka/database';
import { z } from 'zod';
import { hashPassword, hashToken } from '../../utils/crypto';
import { sendSuccess, sendError } from '../../utils/response';

const ActivateSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export class TeamAuthController {
  async activateAccount(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = ActivateSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('INVALID_INPUT', 'Invalid token or password', parseResult.error.flatten()));
        return;
      }

      const { token, password } = parseResult.data;
      const tokenHash = hashToken(token);

      // Start a transaction for atomic activation
      await prisma.$transaction(async (tx) => {
        const invitation = await tx.adminInvitation.findUnique({
          where: { tokenHash },
          include: { adminUser: true },
        });

        if (!invitation) {
          throw new Error('INVALID_TOKEN');
        }

        if (invitation.status === 'ACCEPTED') {
          throw new Error('TOKEN_ALREADY_USED');
        }

        if (invitation.status === 'CANCELLED') {
          throw new Error('INVITATION_CANCELLED');
        }

        if (invitation.expiresAt < new Date()) {
          throw new Error('TOKEN_EXPIRED');
        }

        if (invitation.adminUser.accountStatus !== 'PENDING_INVITE') {
          throw new Error('INVALID_ACCOUNT_STATUS');
        }

        // Hash new password
        const passwordHash = await hashPassword(password);

        // Update user
        await tx.adminUser.update({
          where: { id: invitation.adminUserId },
          data: {
            passwordHash,
            accountStatus: 'ACTIVE',
            isActive: true,
          },
        });

        // Update invitation
        await tx.adminInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            usedAt: new Date(),
          },
        });

        // Invalidate any other pending invitations for this user
        await tx.adminInvitation.updateMany({
          where: {
            adminUserId: invitation.adminUserId,
            status: { in: ['PENDING', 'SENT'] },
            id: { not: invitation.id },
          },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });

        // Create audit log
        await tx.adminAuditLog.create({
          data: {
            adminUserId: invitation.adminUserId,
            action: 'ACCOUNT_ACTIVATED',
            module: 'AUTH',
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      });

      res.status(200).json(sendSuccess(null, 'Account activated successfully. You can now log in.'));
    } catch (error: any) {
      if (['INVALID_TOKEN', 'TOKEN_ALREADY_USED', 'INVITATION_CANCELLED', 'TOKEN_EXPIRED', 'INVALID_ACCOUNT_STATUS'].includes(error.message)) {
         res.status(400).json(sendError('ACTIVATION_FAILED', error.message));
         return;
      }
      console.error('Activation error:', error);
      res.status(500).json(sendError('INTERNAL_ERROR', 'Failed to activate account.'));
    }
  }

  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        res.status(400).json(sendError('INVALID_INPUT', 'Token is required'));
        return;
      }

      const tokenHash = hashToken(token);
      const invitation = await prisma.adminInvitation.findUnique({
        where: { tokenHash },
        include: { adminUser: { select: { email: true, fullName: true, accountStatus: true } } },
      });

      if (!invitation) {
        res.status(400).json(sendError('INVALID_TOKEN', 'Invitation token is invalid.'));
        return;
      }
      
      if (invitation.status === 'ACCEPTED') {
        res.status(400).json(sendError('TOKEN_ALREADY_USED', 'This invitation has already been used.'));
        return;
      }

      if (invitation.status === 'CANCELLED') {
        res.status(400).json(sendError('INVITATION_CANCELLED', 'This invitation has been cancelled.'));
        return;
      }

      if (invitation.expiresAt < new Date()) {
        res.status(400).json(sendError('TOKEN_EXPIRED', 'This invitation has expired.'));
        return;
      }

      res.status(200).json(sendSuccess({
        email: invitation.adminUser.email,
        fullName: invitation.adminUser.fullName,
      }, 'Token is valid.'));
    } catch (error: any) {
      console.error('Validate token error:', error);
      res.status(500).json(sendError('INTERNAL_ERROR', 'Failed to validate token.'));
    }
  }
}
