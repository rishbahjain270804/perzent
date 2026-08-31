import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Prisma, prisma } from '@perzent/database';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

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

/** Client-facing error with an HTTP status and optional machine-readable code. */
export class ApiError extends Error {
  constructor(message: string, public status = 400, public code?: string) {
    super(message);
  }
}

export function hashToken(token: string) {
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

const isTransientDbError = (error: unknown) =>
  error instanceof Prisma.PrismaClientInitializationError ||
  error instanceof Prisma.PrismaClientRustPanicError ||
  (error instanceof Prisma.PrismaClientKnownRequestError && /^P10(0[1-2]|08|17)$/.test(error.code));

export async function requireSession(request: Request, allowedRoles?: Role[]): Promise<AppSession> {
  const token = readToken(request);
  if (!token || token === 'undefined' || token === 'null') {
    throw new AuthError('Authentication required', 401);
  }

  const tokenHash = hashToken(token);
  // Every authenticated request runs this: select only what the session context needs, never the
  // password hash or face blob.
  const lookup = () =>
    prisma.session.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        expires_at: true,
        last_seen_at: true,
        user: { select: { id: true, company_id: true, role: true, status: true, full_name: true, email: true, phone: true } },
      },
    });

  let session: Awaited<ReturnType<typeof lookup>>;
  try {
    session = await lookup();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    // One retry after a short pause covers pooler cold starts / dropped connections.
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      session = await lookup();
    } catch (retryError) {
      console.error('requireSession: database unavailable', retryError);
      throw new AuthError('Service temporarily unavailable. Please try again.', 503);
    }
  }

  if (!session || !session.user || session.expires_at <= new Date() || session.user.status !== 'ACTIVE') {
    throw new AuthError('Session has expired. Please sign in again.', 401);
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new AuthError('You do not have permission to perform this action', 403);
  }

  // Touch last_seen_at at most once every 10 minutes to keep writes cheap.
  if (Date.now() - session.last_seen_at.getTime() > 10 * 60 * 1000) {
    prisma.session.update({ where: { id: session.id }, data: { last_seen_at: new Date() } }).catch(() => undefined);
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
  if (!token) return;
  try {
    await prisma.session.deleteMany({ where: { token_hash: hashToken(token) } });
  } catch (error) {
    console.warn('revokeSession failed', error);
  }
}

/** Revokes every session of a user (device reset, suspension, password change). */
export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.deleteMany({
    where: { user_id: userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) return jsonError(error.message, error.status);
  if (error instanceof ApiError) return jsonError(error.message, error.status, error.code);
  if (error instanceof ZodError) return jsonError(error.issues[0]?.message || 'Invalid request', 400, 'VALIDATION');
  if (error instanceof SyntaxError) return jsonError('Request body must be valid JSON', 400, 'VALIDATION');

  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('Prisma validation error', error.message);
    return jsonError('Invalid request data', 400, 'VALIDATION');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return jsonError('A record with these details already exists', 409, 'CONFLICT');
    if (error.code === 'P2025') return jsonError('Record not found', 404, 'NOT_FOUND');
    if (error.code === 'P2003') return jsonError('Referenced record does not exist', 400, 'VALIDATION');
  }
  if (isTransientDbError(error) || (error instanceof Error && error.message.includes('DATABASE_URL'))) {
    console.error('Database unavailable', error);
    return jsonError('Service temporarily unavailable. Please try again.', 503, 'UNAVAILABLE');
  }

  console.error('Unhandled API error', error);
  return jsonError('Something went wrong. Please try again.', 500);
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
