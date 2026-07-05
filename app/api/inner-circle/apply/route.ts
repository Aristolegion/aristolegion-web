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

  let result;
  try {
    result = await supabaseInsert("inner_circle_applications", {
      full_name: name.trim(),
      email: email.trim().toLowerCase(),
      role_title: role.trim(),
      why_join: whyJoin.trim(),
      capability_goal: capability.trim(),
      contribution: contribution.trim(),
    });
  } catch (error) {
    console.error("Inner Circle application insert failed:", error);
    return Response.json(
      {
        success: false,
        error: "We could not process your application. Please try again.",
      },
      { status: 500 }
    );
  }

  if (!result.ok) {
    return Response.json(
      {
        success: false,
        error: "We could not process your application. Please try again.",
      },
      { status: 502 }
    );
  }

  return Response.json({ success: true });
}
