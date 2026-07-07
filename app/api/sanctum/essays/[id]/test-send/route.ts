import { cookies } from "next/headers";
import { sendNewsletterIssueEmail } from "@/lib/email";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { buildEssayEmailContent } from "@/lib/sanctum/emailContent";
import type { Essay } from "@/lib/sanctum/types";
import { supabaseSelect } from "@/lib/supabase";

const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const LOG_TAG = "ESSAY TEST SEND ERROR";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Sends the exact same branded email a real announcement would, to the
// admin inbox only — never touches sent_at/sent_count, and never reads
// newsletter_subscribers, so it's safe to click on a draft and repeat as
// often as needed while previewing.
export async function POST(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!ADMIN_NOTIFICATION_EMAIL) {
    return Response.json(
      { success: false, error: "Admin notification email is not configured." },
      { status: 500 }
    );
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
    const { subject, html } = buildEssayEmailContent(essay);

    const result = await sendNewsletterIssueEmail(ADMIN_NOTIFICATION_EMAIL, `[TEST] ${subject}`, html);

    if (!result.ok) {
      console.error(LOG_TAG, {
        id: essay.id,
        title: essay.title,
        error: { status: result.status, message: result.message },
      });
      return Response.json(
        { success: false, error: "Unable to send the test email. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error(LOG_TAG, { id, error });
    return Response.json(
      { success: false, error: "Unable to send the test email. Please try again." },
      { status: 500 }
    );
  }
}
