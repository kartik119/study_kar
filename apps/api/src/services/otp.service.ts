import { prisma, OtpPurpose } from '@study-karnataka/database';
import { hashToken, generateOtpCode } from '../utils/crypto';

const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10);

export async function requestOtpChallenge(
  mobile: string,
  purpose: OtpPurpose,
  requestIp?: string,
  userAgent?: string
) {
  const now = new Date();

  // 1. Check existing unexpired challenge for resend cooldown
  const existingChallenge = await prisma.oTPChallenge.findFirst({
    where: {
      mobile,
      purpose,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingChallenge && existingChallenge.resendAvailableAt > now) {
    const retryAfter = Math.ceil((existingChallenge.resendAvailableAt.getTime() - now.getTime()) / 1000);
    const error: any = new Error(`Please wait ${retryAfter} seconds before requesting a new OTP.`);
    error.code = 'OTP_RATE_LIMITED';
    error.retryAfter = retryAfter;
    throw error;
  }

  // 2. Generate raw OTP code
  const rawCode = generateOtpCode();
  const hashedCode = hashToken(rawCode);

  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_SECONDS * 1000);
  const resendAvailableAt = new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000);

  // 3. Store OTP Challenge in database
  const challenge = await prisma.oTPChallenge.create({
    data: {
      mobile,
      purpose,
      hashedCode,
      expiresAt,
      maximumAttempts: OTP_MAX_ATTEMPTS,
      resendAvailableAt,
      requestIp,
      userAgent,
    },
  });

  // 4. Safe logging in local development mode only
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEVELOPMENT OTP SERVICE] Mobile: ${mobile} | Purpose: ${purpose} | Code: ${rawCode} | Challenge ID: ${challenge.id}`);
  }

  return {
    challengeId: challenge.id,
    expiresAt,
    resendAvailableAt,
    // Note: rawCode is returned in response ONLY in dev environment when DEVELOPMENT_OTP is enabled
    devOtp: process.env.NODE_ENV !== 'production' ? rawCode : undefined,
  };
}

export async function verifyOtpChallenge(mobile: string, purpose: OtpPurpose, code: string) {
  const now = new Date();
  const hashedCode = hashToken(code);

  const challenge = await prisma.oTPChallenge.findFirst({
    where: {
      mobile,
      purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) {
    const error: any = new Error('No active OTP challenge found for this mobile number.');
    error.code = 'OTP_INVALID';
    throw error;
  }

  if (challenge.expiresAt < now) {
    const error: any = new Error('OTP has expired. Please request a new code.');
    error.code = 'OTP_EXPIRED';
    throw error;
  }

  if (challenge.attemptsUsed >= challenge.maximumAttempts) {
    const error: any = new Error('Maximum OTP verification attempts exceeded. Please request a new OTP.');
    error.code = 'OTP_ATTEMPTS_EXCEEDED';
    throw error;
  }

  if (challenge.hashedCode !== hashedCode) {
    await prisma.oTPChallenge.update({
      where: { id: challenge.id },
      data: { attemptsUsed: { increment: 1 } },
    });
    const error: any = new Error('Invalid OTP code. Please check and try again.');
    error.code = 'OTP_INVALID';
    throw error;
  }

  // Mark challenge as consumed
  await prisma.oTPChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: now },
  });

  return challenge;
}
