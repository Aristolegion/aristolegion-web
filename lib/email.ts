const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

type SendEmailResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

/**
 * Server-only Resend helper using plain fetch against Resend's HTTP API —
 * avoids pulling in the `resend` SDK, matching this project's existing
 * Supabase pattern (see lib/supabase.ts).
 *
 * The "from" address must belong to a domain verified in the Resend
 * dashboard, or every send will fail — see RESEND_API_KEY in .env.example.
 * Never throws: callers are expected to treat email as best-effort and
 * never let a failure here affect the caller's own success response.
 */
export async function sendAdminNotificationEmail(
  subject: string,
  body: string
): Promise<SendEmailResult> {
  if (!RESEND_API_KEY || !ADMIN_NOTIFICATION_EMAIL) {
    return { ok: false, status: 0, message: "Resend is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Aristolegion Sanctum <sanctum@aristolegion.com>",
      to: [ADMIN_NOTIFICATION_EMAIL],
      subject,
      text: body,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return { ok: false, status: response.status, message };
  }

  return { ok: true };
}

export async function sendNewsletterNotification(email: string): Promise<SendEmailResult> {
  return sendAdminNotificationEmail(
    "New Newsletter Subscriber — Aristolegion",
    `New subscriber joined Aristolegion.

Email:
${email}

View subscribers:
https://www.aristolegion.com/sanctum`
  );
}
