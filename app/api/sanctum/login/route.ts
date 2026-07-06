import { cookies } from "next/headers";
import {
  SANCTUM_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyAdminPassword,
} from "@/lib/sanctum/auth";
import { getRetryAfterSeconds, isBlocked, recordFailure, recordSuccess } from "@/lib/sanctum/rateLimit";

interface LoginPayload {
  password?: unknown;
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isBlocked(clientKey)) {
    const retryAfter = getRetryAfterSeconds(clientKey);
    return Response.json(
      { success: false, error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
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

  const { password } = payload;

  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    recordFailure(clientKey);
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

  recordSuccess(clientKey);

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
