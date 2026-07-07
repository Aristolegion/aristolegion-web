import { supabaseSelect, supabaseUpdate } from "@/lib/supabase";
import type { NewsletterSubscriber } from "@/lib/sanctum/types";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// Public and unauthenticated by design — the token in the URL is the only
// credential needed, exactly like every other email unsubscribe link (see
// unsubscribe_token in supabase/schema.sql). No Sanctum session involved.
export async function POST(request: Request, { params }: RouteParams) {
  const { token } = await params;

  if (!token) {
    return Response.json({ success: false, error: "Invalid link." }, { status: 400 });
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
      { consent: false, unsubscribed_at: new Date().toISOString() }
    );

    if (!result.ok) {
      console.error("UNSUBSCRIBE ERROR:", { status: result.status, message: result.message });
      return Response.json(
        { success: false, error: "Unable to unsubscribe. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("UNSUBSCRIBE ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to unsubscribe. Please try again." },
      { status: 500 }
    );
  }
}
