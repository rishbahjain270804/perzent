/**
 * Transactional email via Resend's HTTP API (no SDK). Configured with RESEND_API_KEY and
 * EMAIL_FROM (e.g. "Perzent <noreply@perzent.jspcoders.app>"). When unset, `emailEnabled()` is false
 * and callers should tell the user to contact support instead of failing silently.
 */
export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  if (!emailEnabled()) throw new Error('Email is not configured (RESEND_API_KEY / EMAIL_FROM missing).');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend rejected the email (${response.status}): ${detail.slice(0, 200)}`);
  }
}
