import { cookies } from "next/headers";
import { excerptFromMarkdown } from "@/lib/markdown";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { escapeHtml, sendToSubscribersInBatches } from "@/lib/sanctum/dispatch";
import type { Essay, NewsletterSubscriber } from "@/lib/sanctum/types";
import { supabaseSelect, supabaseUpdateReturning } from "@/lib/supabase";

const SITE_URL = "https://www.aristolegion.com";
const LOG_TAG = "ESSAY SEND ERROR";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function buildEssayEmailHtml(essay: Essay, excerpt: string, url: string): string {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
      <p style="font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #9c7a1e; margin: 0 0 16px;">
        Aristolegion Essays
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 20px;">
        A new essay is available from Aristolegion.
      </p>
      <h1 style="font-size: 26px; line-height: 1.3; margin: 0 0 20px;">${escapeHtml(essay.title)}</h1>
      <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 28px;">
        ${escapeHtml(excerpt)}
      </p>
      <a
        href="${url}"
        style="display: inline-block; background: #1a1a2e; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; letter-spacing: 0.05em;"
      >
        Read Essay →
      </a>
    </div>
  `.trim();
}

export async function POST(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existingResult = await supabaseSelect<Essay>("essays", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Essay not found." }, { status: 404 });
    }

    const essay = existingResult.data[0];

    if (essay.status !== "published") {
      return Response.json(
        { success: false, error: "Only published content can be sent." },
        { status: 400 }
      );
    }

    if (essay.sent_at) {
      return Response.json(
        { success: false, error: "Already sent." },
        { status: 409 }
      );
    }

    const subscribersResult = await supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
      filter: { consent: "eq.true" },
    });

    if (!subscribersResult.ok) {
      console.error(LOG_TAG, {
        id: essay.id,
        title: essay.title,
        subscriberCount: 0,
        error: { status: subscribersResult.status, message: subscribersResult.message },
      });
      return Response.json(
        { success: false, error: "Unable to load subscribers. Please try again." },
        { status: 500 }
      );
    }

    const emails = subscribersResult.data.map((subscriber) => subscriber.email);
    const url = `${SITE_URL}/essays/${essay.slug}`;
    const excerpt = excerptFromMarkdown(essay.content);
    const html = buildEssayEmailHtml(essay, excerpt, url);
    const subject = `New Aristolegion Essay: ${essay.title}`;

    const { successCount } = await sendToSubscribersInBatches(emails, subject, html, {
      id: essay.id,
      title: essay.title,
      subscriberCount: emails.length,
      logTag: LOG_TAG,
    });

    const result = await supabaseUpdateReturning<Essay>(
      "essays",
      { id },
      { sent_at: new Date().toISOString(), sent_count: successCount }
    );

    if (!result.ok) {
      console.error(LOG_TAG, {
        id: essay.id,
        title: essay.title,
        subscriberCount: emails.length,
        error: { status: result.status, message: result.message },
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
      essay: result.data,
      subscriberCount: emails.length,
      sentCount: successCount,
    });
  } catch (error) {
    console.error(LOG_TAG, { id, title: null, subscriberCount: 0, error });
    return Response.json(
      { success: false, error: "Unable to send this essay. Please try again." },
      { status: 500 }
    );
  }
}
