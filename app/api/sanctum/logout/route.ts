import { cookies } from "next/headers";
import { SANCTUM_SESSION_COOKIE } from "@/lib/sanctum/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SANCTUM_SESSION_COOKIE);
  return Response.json({ success: true });
}
