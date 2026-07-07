import { supabaseSelect, supabaseUpdate } from "@/lib/supabase";
import type { NewsletterSubscriber } from "@/lib/sanctum/types";

interface RouteParams {
  params: Promise<{ token: string }>;
}

interface PreferencesBody {
  consent?: unknown;
}

// Public and unauthenticated by design — same token-as-credential model as
// /api/unsubscribe. All three checkboxes on the preferences page currently
// map to the same underlying consent flag (see components/preferences/
// PreferencesForm.tsx), so saving is a single true/false update.
// unsubscribed_at is kept in sync so "unsubscribed" (consent=false,
// unsubscribed_at populated) is reached the same way whether someone
// unchecks everything here or uses the dedicated unsubscribe link, and
// re-checking here clears unsubscribed_at to re-opt in.
export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;

  if (!token) {
    return Response.json({ success: false, error: "Invalid link." }, { status: 400 });
  }

  let body: PreferencesBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.consent !== "boolean") {
    return Response.json({ success: false, error: "Invalid preferences." }, { status: 400 });
  }

  try {
    const existingResult = await supabaseSelect<NewsletterSubscriber>("newsletter_subscribers", {
      filter: { unsubscribe_token: `eq.${token}` },
    });

    if (!existingResult.ok || existingResult.data.length === 0) {
      return Response.json({ success: false, error: "Invalid or expired link." }, { status: 404 });
    }

    const result = await supabaseUpdate(
      "newsletter_subscribers",
      { unsubscribe_token: token },
      {
        consent: body.consent,
        unsubscribed_at: body.consent ? null : new Date().toISOString(),
      }
    );

    if (!result.ok) {
      console.error("PREFERENCES UPDATE ERROR:", { status: result.status, message: result.message });
      return Response.json(
        { success: false, error: "Unable to save your preferences. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("PREFERENCES UPDATE ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to save your preferences. Please try again." },
      { status: 500 }
    );
  }
}
