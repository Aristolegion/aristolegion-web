import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE } from "@/lib/sanctum/auth";
import { revokeAdminSession } from "@/lib/sanctum/sessionRegistry";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SANCTUM_SESSION_COOKIE)?.value;
  try {
    await revokeAdminSession(token);
  } catch {
    cookieStore.delete(SANCTUM_SESSION_COOKIE);
    return Response.json(
      { success: false, error: "Logout revocation temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  cookieStore.delete(SANCTUM_SESSION_COOKIE);
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
