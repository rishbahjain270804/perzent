import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@perzent/database';
import { NextResponse } from 'next/server';

export type Role = 'OWNER' | 'MANAGER' | 'EMPLOYEE';

const SESSION_COOKIE = 'perzent_session';
const SESSION_DAYS = 30;

export type AppSession = {
  sessionId: string;
  userId: string;
  companyId: string;
  role: Role;
  fullName: string;
  email: string | null;
  phone: string;
};

export class AuthError extends Error {
  constructor(message = 'Authentication required', public status = 401) {
    super(message);
  }
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function readToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();

  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { user_id: userId, token_hash: hashToken(token), expires_at: expiresAt },
  });
  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export async function requireSession(request: Request, allowedRoles?: Role[]): Promise<AppSession> {
  const token = readToken(request);
  if (!token) throw new AuthError();

  const session = await prisma.session.findUnique({
    where: { token_hash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expires_at <= new Date() || session.user.status !== 'ACTIVE') {
    throw new AuthError('Session has expired');
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new AuthError('You do not have permission to perform this action', 403);
  }

  return {
    sessionId: session.id,
    userId: session.user.id,
    companyId: session.user.company_id,
    role: session.user.role,
    fullName: session.user.full_name,
    email: session.user.email,
    phone: session.user.phone,
  };
}

export async function revokeSession(request: Request) {
  const token = readToken(request);
  if (token) await prisma.session.deleteMany({ where: { token_hash: hashToken(token) } });
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Server error';
  if (message.includes('DATABASE_URL')) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 503 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
