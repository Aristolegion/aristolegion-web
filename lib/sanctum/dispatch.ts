import { sendNewsletterIssueEmail } from "@/lib/email";

const SEND_CONCURRENCY = 10;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface DispatchLogContext {
  id: string;
  title: string;
  subscriberCount: number;
  logTag: string;
}

/**
 * Sends one HTML email per recipient in small concurrent batches — the same
 * batching shape as the Newsletter Issue send endpoint
 * (app/api/sanctum/newsletter-issues/[id]/send/route.ts), extracted here so
 * Publications and Essays can reuse it without duplicating the loop, while
 * leaving that file itself untouched.
 */
export async function sendToSubscribersInBatches(
  emails: string[],
  subject: string,
  html: string,
  context: DispatchLogContext
): Promise<{ successCount: number }> {
  let successCount = 0;

  for (let i = 0; i < emails.length; i += SEND_CONCURRENCY) {
    const batch = emails.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((email) => sendNewsletterIssueEmail(email, subject, html))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.ok) {
        successCount++;
      } else {
        console.error(context.logTag, {
          id: context.id,
          title: context.title,
          subscriberCount: context.subscriberCount,
          error: result.status === "fulfilled" ? result.value : result.reason,
        });
      }
    }
  }

  return { successCount };
}
