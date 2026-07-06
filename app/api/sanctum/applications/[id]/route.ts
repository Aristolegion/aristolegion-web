import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, isValidSessionToken } from "@/lib/sanctum/auth";
import { supabaseUpdate } from "@/lib/supabase";
import type { ApplicationStatus } from "@/lib/sanctum/types";

const VALID_STATUSES: ApplicationStatus[] = ["pending", "accepted", "rejected"];

interface StatusPayload {
  status?: unknown;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;

  if (!isValidSessionToken(token)) {
    return Response.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const { id } = await params;

  let payload: StatusPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  const { status } = payload;

  if (
    typeof status !== "string" ||
    !VALID_STATUSES.includes(status as ApplicationStatus)
  ) {
    return Response.json(
      { success: false, error: "Invalid status." },
      { status: 400 }
    );
  }

  try {
    const result = await supabaseUpdate(
      "inner_circle_applications",
      { id },
      { status }
    );

    if (!result.ok) {
      console.error("SUPABASE UPDATE ERROR:", {
        status: result.status,
        message: result.message,
      });
      return Response.json(
        { success: false, error: "Unable to update status. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("SANCTUM STATUS UPDATE ERROR:", error);
    return Response.json(
      { success: false, error: "Unable to update status. Please try again." },
      { status: 500 }
    );
  }
}
