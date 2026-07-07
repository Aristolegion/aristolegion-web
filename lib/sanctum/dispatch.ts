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

export interface DispatchRecipient {
  email: string;
  /** Fully-built HTML for this one recipient (their own unsubscribe/preferences links already embedded). */
  html: string;
}

/**
 * Sends one HTML email per recipient in small concurrent batches — the same
 * batching shape as the Newsletter Issue send endpoint
 * (app/api/sanctum/newsletter-issues/[id]/send/route.ts), extracted here so
 * Publications and Essays can reuse it without duplicating the loop. Each
 * recipient gets their own pre-built html (not one shared body) so every
 * subscriber's footer links point at their own token.
 */
export async function sendToSubscribersInBatches(
  recipients: DispatchRecipient[],
  subject: string,
  context: DispatchLogContext
): Promise<{ successCount: number }> {
  let successCount = 0;

  for (let i = 0; i < recipients.length; i += SEND_CONCURRENCY) {
    const batch = recipients.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((recipient) => sendNewsletterIssueEmail(recipient.email, subject, recipient.html))
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
