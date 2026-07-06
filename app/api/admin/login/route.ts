import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin/auth";

interface LoginPayload {
  password?: unknown;
}

export async function POST(request: Request) {
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
    return Response.json(
      { success: false, error: "Incorrect password." },
      { status: 401 }
    );
  }

  let token: string;
  try {
    token = getAdminSessionToken();
  } catch (error) {
    console.error("ADMIN LOGIN CONFIG ERROR:", error);
    return Response.json(
      { success: false, error: "Admin access is not configured." },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return Response.json({ success: true });
}
