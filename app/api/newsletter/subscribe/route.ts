import { sendNewsletterNotification } from "@/lib/email";
import type { NewsletterSubscriber } from "@/lib/sanctum/types";
import { supabaseInsert, supabaseSelect, supabaseUpdate } from "@/lib/supabase";

interface SubscribePayload {
  email?: unknown;
  consent?: unknown;
  source?: unknown;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Supabase's PostgREST error body is JSON (e.g. { code, message, details,
// hint }), but lib/supabase.ts hands it back as raw response text. Parse it
// so server logs show structured details instead of an opaque string. This
// is never sent to the client — see the generic response below.
function parseSupabaseErrorBody(rawMessage: string): unknown {
  try {
    return JSON.parse(rawMessage);
  } catch {
    return rawMessage;
  }
}

export async function POST(request: Request) {
  let payload: SubscribePayload;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { email, consent, source } = payload;

  if (typeof email !== "string" || !isValidEmail(email)) {
    return Response.json(
      { success: false, error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  if (consent !== true) {
    return Response.json(
      { success: false, error: "Consent is required to subscribe." },
      { status: 400 }
    );
  }

  let result;
  try {
    result = await supabaseInsert("newsletter_subscribers", {
      email: email.trim().toLowerCase(),
      consent: true,
      source:
        typeof source === "string" && source.trim() ? source.trim() : "website",
    });
  } catch (error) {
    console.error("Newsletter subscription insert failed:", error);
    return Response.json(
      {
        success: false,
        error: "We could not process your subscription. Please try again.",
      },
      { status: 500 }
    );
  }

  if (!result.ok) {
    // A unique-constraint violation means this email is already in the
    // table. If it's an active subscriber, that's the existing graceful
    // "already subscribed" success. If they previously unsubscribed
    // (consent=false and/or unsubscribed_at set), this is a genuine
    // resubscribe attempt — reactivate the same row (same id, same
    // unsubscribe_token, same created_at) rather than silently doing
    // nothing, which is what a duplicate-email insert used to do.
    if (result.status === 409) {
      const trimmedEmail = email.trim().toLowerCase();

      try {
        const existingResult = await supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
          filter: { email: `eq.${trimmedEmail}` },
        });

        if (existingResult.ok && existingResult.data.length > 0) {
          const existing = existingResult.data[0];

          if (!existing.consent || existing.unsubscribed_at) {
            const reactivateResult = await supabaseUpdate(
              "newsletter_subscribers",
              { email: trimmedEmail },
              { consent: true, unsubscribed_at: null }
            );

            if (!reactivateResult.ok) {
              console.error("NEWSLETTER REACTIVATE ERROR:", {
                status: reactivateResult.status,
                message: reactivateResult.message,
              });
              return Response.json(
                {
                  success: false,
                  error: "We could not process your subscription. Please try again.",
                },
                { status: 502 }
              );
            }

            return Response.json({ success: true, reactivated: true });
          }
        }
      } catch (error) {
        console.error("NEWSLETTER REACTIVATE ERROR:", error);
      }

      return Response.json({ success: true, alreadySubscribed: true });
    }

    console.error("SUPABASE INSERT ERROR:", {
      status: result.status,
      details: parseSupabaseErrorBody(result.message),
    });

    return Response.json(
      {
        success: false,
        error: "We could not process your subscription. Please try again.",
      },
      { status: 502 }
    );
  }

  // Best-effort notification only — a failed send must never fail the
  // subscription itself, which is already safely stored in Supabase.
  try {
    const emailResult = await sendNewsletterNotification(email.trim().toLowerCase());

    if (!emailResult.ok) {
      console.error("NEWSLETTER EMAIL ERROR:", {
        status: emailResult.status,
        message: emailResult.message,
      });
    }
  } catch (error) {
    console.error("NEWSLETTER EMAIL ERROR:", error);
  }

  return Response.json({ success: true });
}
