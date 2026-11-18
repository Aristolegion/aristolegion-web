import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, verifyAdminPassword } from "@/lib/sanctum/auth";
import { admitLoginAttempt } from "@/lib/sanctum/rateLimit";
import { issueAdminSession } from "@/lib/sanctum/sessionRegistry";

interface LoginPayload { password?: unknown; }

export async function POST(request: Request) {
  let admission;
  try {
    admission = await admitLoginAttempt(request);
  } catch {
    return Response.json({ success: false, error: "Login temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!admission.allowed) {
    return Response.json({ success: false, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(admission.retryAfterSeconds), "Cache-Control": "no-store" } });
  }

  let payload: LoginPayload;
  try { payload = await request.json(); }
  catch { return Response.json({ success: false, error: "Invalid request." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Response.json({ success: false, error: "Invalid request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (typeof payload.password !== "string" || !verifyAdminPassword(payload.password)) {
    return Response.json({ success: false, error: "Incorrect password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let token: string;
  try {
    token = await issueAdminSession();
  } catch {
    return Response.json({ success: false, error: "Login temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  // A successful login never resets the shared WU-02 attempt counter.
  const cookieStore = await cookies();
  cookieStore.set(SANCTUM_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
