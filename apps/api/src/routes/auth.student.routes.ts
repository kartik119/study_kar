import { Router, Request, Response } from 'express';
import { prisma } from '@study-karnataka/database';
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  StudentRegistrationSchema,
  isMinor,
} from '@study-karnataka/validation';
import { requestOtpChallenge, verifyOtpChallenge } from '../services/otp.service';
import { sendSuccess, sendError } from '../utils/response';
import { hashToken } from '../utils/crypto';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { serializeStudent } from '../utils/serializer';

const router: Router = Router();

// 1. POST /api/v1/auth/student/otp/request
router.post('/auth/student/otp/request', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = RequestOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(sendError('INVALID_MOBILE', 'Validation error', parseResult.error.flatten()));
      return;
    }

    const { mobile, purpose } = parseResult.data;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    const challenge = await requestOtpChallenge(mobile, purpose, ipAddress, userAgent);

    res.status(200).json(
      sendSuccess(challenge, 'OTP request successful. Code sent to mobile number.')
    );
  } catch (err: any) {
    if (err.code === 'OTP_RATE_LIMITED') {
      res.status(429).json(sendError('OTP_RATE_LIMITED', err.message, { retryAfter: err.retryAfter }));
      return;
    }
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to process OTP request'));
  }
});

// 2. POST /api/v1/auth/student/otp/verify
router.post('/auth/student/otp/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = VerifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(sendError('OTP_INVALID', 'Validation error', parseResult.error.flatten()));
      return;
    }

    const { mobile, otp, purpose } = parseResult.data;
    await verifyOtpChallenge(mobile, purpose, otp);

    const existingUser = await prisma.user.findUnique({
      where: { mobile },
      include: {
        studentProfile: true,
        guardianConsents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!existingUser) {
      res.status(200).json(
        sendSuccess(
          {
            isRegistered: false,
            mobile,
            message: 'OTP verified. Please complete student registration details.',
          },
          'OTP verified successfully. Registration required.'
        )
      );
      return;
    }

    const platform = (req.headers['x-platform'] as any) || 'WEB';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];
    const deviceId = req.headers['x-device-id'] as string;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const dummySessionId = `session_${Date.now()}`;
    const initialRefreshToken = signRefreshToken({
      userId: existingUser.id,
      accountType: 'STUDENT',
      sessionId: dummySessionId,
    });

    const session = await prisma.userSession.create({
      data: {
        userId: existingUser.id,
        refreshTokenHash: hashToken(initialRefreshToken),
        platform: platform in ['WEB', 'ANDROID', 'IOS', 'ADMIN_WEB'] ? platform : 'WEB',
        ipAddress,
        userAgent,
        deviceId,
        expiresAt,
      },
    });

    const refreshToken = signRefreshToken({
      userId: existingUser.id,
      accountType: 'STUDENT',
      sessionId: session.id,
    });

    await prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    const accessToken = signAccessToken({
      userId: existingUser.id,
      accountType: 'STUDENT',
      sessionId: session.id,
    });

    await prisma.user.update({
      where: { id: existingUser.id },
      data: { lastLoginAt: new Date(), mobileVerifiedAt: new Date() },
    });

    const serialized = serializeStudent(existingUser, [], true);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json(
      sendSuccess(
        {
          isRegistered: true,
          user: serialized,
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
        'Student authenticated successfully.'
      )
    );
  } catch (err: any) {
    if (['OTP_INVALID', 'OTP_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED'].includes(err.code)) {
      res.status(400).json(sendError(err.code, err.message));
      return;
    }
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to verify OTP'));
  }
});

// 3. POST /api/v1/auth/student/registration/complete
router.post('/auth/student/registration/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = StudentRegistrationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json(sendError('REGISTRATION_INCOMPLETE', 'Validation error', parseResult.error.flatten()));
      return;
    }

    const { mobile, fullName, dateOfBirth, preparationLanguage, email, guardianDetails } = parseResult.data;

    const existing = await prisma.user.findUnique({ where: { mobile } });
    if (existing) {
      res.status(409).json(sendError('MOBILE_ALREADY_REGISTERED', 'A student account with this mobile number already exists.'));
      return;
    }

    const minor = isMinor(dateOfBirth);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          mobile,
          email: email || null,
          fullName,
          accountType: 'STUDENT',
          accountStatus: 'ACTIVE',
          preparationLanguage: preparationLanguage as any,
          mobileVerifiedAt: new Date(),
          studentProfile: {
            create: {
              dateOfBirth,
              preparationLanguage: preparationLanguage as any,
              profileCompletedAt: minor ? null : new Date(),
            },
          },
        },
        include: {
          studentProfile: true,
        },
      });

      if (minor && guardianDetails) {
        await tx.guardianConsent.create({
          data: {
            studentUserId: newUser.id,
            guardianName: guardianDetails.guardianName,
            guardianRelationship: guardianDetails.guardianRelationship,
            guardianMobile: guardianDetails.guardianMobile,
            consentStatus: 'PENDING',
          },
        });
      }

      return newUser;
    });

    const platform = (req.headers['x-platform'] as any) || 'WEB';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dummySessionId = `session_${Date.now()}`;

    const initialRefreshToken = signRefreshToken({
      userId: user.id,
      accountType: 'STUDENT',
      sessionId: dummySessionId,
    });

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(initialRefreshToken),
        platform: platform in ['WEB', 'ANDROID', 'IOS', 'ADMIN_WEB'] ? platform : 'WEB',
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      accountType: 'STUDENT',
      sessionId: session.id,
    });

    await prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      accountType: 'STUDENT',
      sessionId: session.id,
    });

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { studentProfile: true, guardianConsents: true },
    });

    const serialized = serializeStudent(fullUser, [], true);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json(
      sendSuccess(
        {
          user: serialized,
          accessToken,
          refreshToken,
          expiresIn: 900,
          isMinor: minor,
          consentStatus: minor ? 'PENDING' : 'NOT_REQUIRED',
        },
        minor
          ? 'Student registration submitted. Under-18 guardian consent required for full access.'
          : 'Student registration completed successfully.'
      )
    );
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Registration failed'));
  }
});

// 4. POST /api/v1/auth/guardian/otp/request
router.post('/auth/guardian/otp/request', async (req: Request, res: Response): Promise<void> => {
  try {
    const { guardianMobile } = req.body;
    if (!guardianMobile) {
      res.status(400).json(sendError('INVALID_MOBILE', 'Guardian mobile number is required'));
      return;
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    const challenge = await requestOtpChallenge(guardianMobile, 'GUARDIAN_CONSENT', ipAddress, userAgent);

    res.status(200).json(sendSuccess(challenge, 'Guardian consent OTP requested successfully.'));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Guardian OTP request failed'));
  }
});

// 5. POST /api/v1/auth/guardian/otp/verify
router.post('/auth/guardian/otp/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { guardianMobile, otp, studentUserId } = req.body;
    if (!guardianMobile || !otp || !studentUserId) {
      res.status(400).json(sendError('OTP_INVALID', 'Guardian mobile, OTP, and studentUserId are required'));
      return;
    }

    await verifyOtpChallenge(guardianMobile, 'GUARDIAN_CONSENT', otp);

    const consent = await prisma.guardianConsent.findFirst({
      where: { studentUserId, consentStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });

    if (consent) {
      await prisma.guardianConsent.update({
        where: { id: consent.id },
        data: {
          consentStatus: 'VERIFIED',
          consentVerifiedAt: new Date(),
          verificationMethod: 'GUARDIAN_MOBILE_OTP',
        },
      });

      await prisma.studentProfile.update({
        where: { userId: studentUserId },
        data: { profileCompletedAt: new Date() },
      });
    }

    res.status(200).json(
      sendSuccess({ studentUserId, consentStatus: 'VERIFIED' }, 'Guardian consent verified successfully.')
    );
  } catch (err: any) {
    res.status(400).json(sendError(err.code || 'OTP_INVALID', err.message || 'Guardian OTP verification failed'));
  }
});

export default router;
