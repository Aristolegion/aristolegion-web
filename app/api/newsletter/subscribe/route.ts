import { supabaseInsert } from "@/lib/supabase";

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
    // A unique-constraint violation means this email is already subscribed —
    // treat that as a graceful success rather than an error.
    if (result.status === 409) {
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

  return Response.json({ success: true });
}
