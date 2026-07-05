import { supabaseInsert } from "@/lib/supabase";

interface ApplicationPayload {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  whyJoin?: unknown;
  capability?: unknown;
  contribution?: unknown;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Supabase's PostgREST error body is JSON (e.g. { code, message, details,
// hint }), but lib/supabase.ts hands it back as raw response text. Parse it
// so logs and the temporary debug response show structured details instead
// of an opaque string.
function parseSupabaseErrorBody(rawMessage: string): unknown {
  try {
    return JSON.parse(rawMessage);
  } catch {
    return rawMessage;
  }
}

function extractErrorMessage(details: unknown, fallback: string): string {
  if (
    typeof details === "object" &&
    details !== null &&
    "message" in details &&
    typeof (details as { message: unknown }).message === "string"
  ) {
    return (details as { message: string }).message;
  }
  return fallback;
}

export async function POST(request: Request) {
  let payload: ApplicationPayload;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { name, email, role, whyJoin, capability, contribution } = payload;

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(role) ||
    !isNonEmptyString(whyJoin) ||
    !isNonEmptyString(capability) ||
    !isNonEmptyString(contribution)
  ) {
    return Response.json(
      { success: false, error: "All fields are required." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return Response.json(
      { success: false, error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  try {
    const result = await supabaseInsert("inner_circle_applications", {
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      role_title: role.trim(),
      why_join: whyJoin.trim(),
      capability_goal: capability.trim(),
      contribution: contribution.trim(),
    });

    if (!result.ok) {
      const details = parseSupabaseErrorBody(result.message);

      console.error("SUPABASE INSERT ERROR:", {
        status: result.status,
        details,
      });

      // TEMPORARY: surfaces the real Supabase error (column mismatch,
      // constraint violation, missing column, etc.) in the response so it
      // shows up in Vercel Function Logs and the browser while we diagnose
      // the 502. Revert to a generic message once the root cause is fixed.
      return Response.json(
        {
          success: false,
          error: extractErrorMessage(
            details,
            "We could not process your application. Please try again."
          ),
          details,
        },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("INNER CIRCLE API ERROR:", error);
    return Response.json(
      {
        success: false,
        error: "We could not process your application. Please try again.",
      },
      { status: 500 }
    );
  }
}
