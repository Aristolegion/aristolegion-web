import { cookies } from "next/headers";
import { sendNewsletterIssueEmail } from "@/lib/email";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { buildNewsletterIssueEmailContent } from "@/lib/sanctum/emailContent";
import type { NewsletterIssue, NewsletterSubscriber } from "@/lib/sanctum/types";
import { supabaseSelect, supabaseUpdateReturning } from "@/lib/supabase";

const SEND_CONCURRENCY = 10;

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface Recipient {
  email: string;
  html: string;
}

async function sendToSubscribers(
  recipients: Recipient[],
  subject: string
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
        console.error("NEWSLETTER ISSUE SEND ERROR:", {
          detail: result.status === "fulfilled" ? result.value : result.reason,
        });
      }
    }
  }

  return { successCount };
}

export async function POST(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existingResult = await supabaseSelect<NewsletterIssue>("newsletter_issues", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Newsletter issue not found." }, { status: 404 });
    }

    const issue = existingResult.data[0];

    if (issue.status !== "published") {
      return Response.json(
        { success: false, error: "Publish this issue before sending it to subscribers." },
        { status: 400 }
      );
    }

    // The one guard that makes "Send to Subscribers" safe to click without
    // fear of a double-send: once sent_at is set, this endpoint refuses to
    // run again for this issue, no matter how many times it's called.
    if (issue.sent_at) {
      return Response.json(
        { success: false, error: "This issue has already been sent to subscribers." },
        { status: 409 }
      );
    }

    // Same eligibility filter as the Publication/Essay dispatch endpoints —
    // unsubscribing must actually stop Newsletter Issue emails too, or the
    // "Unsubscribe" link in this exact email type would be a lie.
    const subscribersResult = await supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
      filter: { consent: "eq.true", unsubscribed_at: "is.null" },
    });

    if (!subscribersResult.ok) {
      console.error("NEWSLETTER ISSUE SEND ERROR:", {
        source: "subscribers_fetch",
        status: subscribersResult.status,
        message: subscribersResult.message,
      });
      return Response.json(
        { success: false, error: "Unable to load subscribers. Please try again." },
        { status: 500 }
      );
    }

    const { subject } = buildNewsletterIssueEmailContent(issue);
    const recipients = subscribersResult.data.map((subscriber) => ({
      email: subscriber.email,
      html: buildNewsletterIssueEmailContent(issue, subscriber.unsubscribe_token).html,
    }));

    const { successCount } = await sendToSubscribers(recipients, subject);

    const result = await supabaseUpdateReturning<NewsletterIssue>(
      "newsletter_issues",
      { id },
      { sent_at: new Date().toISOString(), sent_count: successCount }
    );

    if (!result.ok) {
      console.error("NEWSLETTER ISSUE SEND ERROR:", {
        source: "mark_sent",
        status: result.status,
        message: result.message,
      });
      return Response.json(
        {
          success: false,
          error:
            "Emails were sent, but we could not record the send — please check Sanctum before sending again.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      issue: result.data,
      subscriberCount: recipients.length,
      sentCount: successCount,
    });
  } catch (error) {
    console.error("NEWSLETTER ISSUE SEND ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to send this issue. Please try again." },
      { status: 500 }
    );
  }
}
