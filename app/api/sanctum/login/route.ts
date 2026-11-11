import { cookies } from "next/headers";
import {
  SANCTUM_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyAdminPassword,
} from "@/lib/sanctum/auth";
import { admitLoginAttempt } from "@/lib/sanctum/rateLimit";

interface LoginPayload {
  password?: unknown;
}

export async function POST(request: Request) {
  let admission;
  try {
    admission = await admitLoginAttempt(request);
  } catch {
    // A failed Redis request, missing credentials or untrusted ingress MUST
    // never fall back to a process-local limiter or allow password checking.
    return Response.json(
      { success: false, error: "Login temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!admission.allowed) {
    return Response.json(
      { success: false, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(admission.retryAfterSeconds), "Cache-Control": "no-store" } }
    );
  }

  let payload: LoginPayload;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400 });
  }
  const { password } = payload;

  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return Response.json(
      { success: false, error: "Incorrect password." },
      { status: 401 }
    );
  }

  let token: string;
  try {
    token = createSessionToken();
  } catch (error) {
    console.error("SANCTUM LOGIN CONFIG ERROR:", error);
    return Response.json(
      { success: false, error: "Admin access is not configured." },
      { status: 500 }
    );
  }

  // Deliberately do not clear shared counters after success. An unconditional
  // reset can erase concurrent failures from another request. A fixed-window
  // attempt budget is conservative and cannot be reset by successful logins.

  const cookieStore = await cookies();
  cookieStore.set(SANCTUM_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return Response.json({ success: true });
}
