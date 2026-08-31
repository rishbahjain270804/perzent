import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@perzent/database';
import { BRAND, PASSWORD_MIN_LENGTH } from '@perzent/shared-types';
import { authErrorResponse, jsonError, revokeUserSessions } from '@/lib/auth';
import { emailEnabled, sendEmail } from '@/lib/email';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const TOKEN_TTL_MS = 30 * 60 * 1000;

const RequestSchema = z.object({ action: z.literal('request'), email: z.string().trim().email().max(200) });
const ConfirmSchema = z.object({
  action: z.literal('confirm'),
  token: z.string().trim().min(20).max(200),
  new_password: z.string().min(PASSWORD_MIN_LENGTH).max(128),
});
const BodySchema = z.discriminatedUnion('action', [RequestSchema, ConfirmSchema]);

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Owner / manager self-service password reset. Employees have no email on file; their manager
 * resets them from the Employees page. Responses never reveal whether an email is registered.
 */
export async function POST(request: Request) {
  try {
    const body = BodySchema.parse(await request.json());
    const ip = clientIp(request);

    if (body.action === 'request') {
      const blocked = rateLimit(`pwreset:${ip}`, 5, 15 * 60 * 1000);
      if (blocked) return jsonError(`Too many requests. Try again in ${blocked}s.`, 429, 'RATE_LIMITED');
      if (!emailEnabled()) {
        return jsonError(`Password reset by email is not available yet. Write to ${BRAND.supportEmail} and we will verify you and reset it.`, 503, 'EMAIL_UNAVAILABLE');
      }
      const email = body.email.toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } },
        select: { id: true, full_name: true, email: true },
      });
      if (user?.email) {
        const token = randomBytes(32).toString('base64url');
        await prisma.$transaction([
          prisma.passwordReset.deleteMany({ where: { user_id: user.id } }),
          prisma.passwordReset.create({ data: { user_id: user.id, token_hash: hashToken(token), expires_at: new Date(Date.now() + TOKEN_TTL_MS) } }),
        ]);
        const link = `${BRAND.webUrl}/reset-password?token=${token}`;
        await sendEmail({
          to: user.email,
          subject: `Reset your ${BRAND.productName} password`,
          text: `Hi ${user.full_name},\n\nSomeone asked to reset the password for your ${BRAND.productName} account. Open this link within 30 minutes to choose a new password:\n\n${link}\n\nIf you did not ask for this, ignore this email — your password stays the same.\n\n${BRAND.developerName} · ${BRAND.supportEmail}`,
          html: `<p>Hi ${user.full_name},</p><p>Someone asked to reset the password for your ${BRAND.productName} account. Open this link within 30 minutes to choose a new password:</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore this email — your password stays the same.</p><p>${BRAND.developerName} · ${BRAND.supportEmail}</p>`,
        });
      }
      // Same answer whether or not the address exists.
      return NextResponse.json({ ok: true, message: 'If that email is registered, a reset link is on its way. Check spam too.' });
    }

    const blocked = rateLimit(`pwconfirm:${ip}`, 10, 15 * 60 * 1000);
    if (blocked) return jsonError(`Too many attempts. Try again in ${blocked}s.`, 429, 'RATE_LIMITED');
    const reset = await prisma.passwordReset.findUnique({ where: { token_hash: hashToken(body.token) }, include: { user: { select: { id: true, status: true } } } });
    if (!reset || reset.used_at || reset.expires_at < new Date() || reset.user.status !== 'ACTIVE') {
      return jsonError('This reset link is invalid or has expired. Request a new one.', 400, 'INVALID_TOKEN');
    }
    const passwordHash = await hash(body.new_password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.user_id }, data: { password_hash: passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { used_at: new Date() } }),
    ]);
    await revokeUserSessions(reset.user_id).catch(() => undefined);
    return NextResponse.json({ ok: true, message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    return authErrorResponse(error);
  }
}
