import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { sendToSubscribersInBatches } from "@/lib/sanctum/dispatch";
import { buildPublicationEmailContent } from "@/lib/sanctum/emailContent";
import type { NewsletterSubscriber, Publication } from "@/lib/sanctum/types";
import { supabaseSelect, supabaseUpdateReturning } from "@/lib/supabase";

const LOG_TAG = "PUBLICATION SEND ERROR";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existingResult = await supabaseSelect<Publication>("publications", {
      filter: { id: `eq.${id}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Publication not found." }, { status: 404 });
    }

    const publication = existingResult.data[0];

    if (publication.status !== "published") {
      return Response.json(
        { success: false, error: "Only published content can be sent." },
        { status: 400 }
      );
    }

    if (publication.sent_at) {
      return Response.json(
        { success: false, error: "Already sent." },
        { status: 409 }
      );
    }

    const subscribersResult = await supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
      filter: { consent: "eq.true", unsubscribed_at: "is.null" },
    });

    if (!subscribersResult.ok) {
      console.error(LOG_TAG, {
        id: publication.id,
        title: publication.title,
        subscriberCount: 0,
        error: { status: subscribersResult.status, message: subscribersResult.message },
      });
      return Response.json(
        { success: false, error: "Unable to load subscribers. Please try again." },
        { status: 500 }
      );
    }

    const { subject } = buildPublicationEmailContent(publication);
    const recipients = subscribersResult.data.map((subscriber) => ({
      email: subscriber.email,
      html: buildPublicationEmailContent(publication, subscriber.unsubscribe_token).html,
    }));

    const { successCount } = await sendToSubscribersInBatches(recipients, subject, {
      id: publication.id,
      title: publication.title,
      subscriberCount: recipients.length,
      logTag: LOG_TAG,
    });

    const result = await supabaseUpdateReturning<Publication>(
      "publications",
      { id },
      { sent_at: new Date().toISOString(), sent_count: successCount }
    );

    if (!result.ok) {
      console.error(LOG_TAG, {
        id: publication.id,
        title: publication.title,
        subscriberCount: recipients.length,
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
      publication: result.data,
      subscriberCount: recipients.length,
      sentCount: successCount,
    });
  } catch (error) {
    console.error(LOG_TAG, { id, title: null, subscriberCount: 0, error });
    return Response.json(
      { success: false, error: "Unable to send this publication. Please try again." },
      { status: 500 }
    );
  }
}
