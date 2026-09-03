import { timingSafeEqual } from 'crypto';

/**
 * Operator (JSP Coders) endpoints are platform-wide, so no tenant session fits them. They are
 * authenticated with `Authorization: Bearer <OPERATOR_SECRET>`; CRON_SECRET doubles as the
 * fallback so the existing Vercel env works without changes. Rotate by setting OPERATOR_SECRET.
 */
export function operatorAuthorized(request: Request): boolean {
  const secret = process.env.OPERATOR_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
