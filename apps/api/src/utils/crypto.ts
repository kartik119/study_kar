// @ts-nocheck
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOtpCode(): string {
  if (process.env.DEVELOPMENT_OTP) {
    return process.env.DEVELOPMENT_OTP;
  }
  // Generate random 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}
