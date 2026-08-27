/**
 * Best-effort in-memory rate limiter (per serverless instance). It is not a substitute for an
 * edge/WAF limiter, but it stops naive credential stuffing and accidental client retry storms.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Returns `null` when allowed, or the number of seconds until the bucket resets when blocked.
 */
export function rateLimit(key: string, limit: number, windowMs: number): number | null {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > limit) return Math.ceil((bucket.resetAt - now) / 1000);
  return null;
}
