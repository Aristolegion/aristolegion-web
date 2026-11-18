/** Reject unknown Vercel environments instead of silently sharing development keys. */
export function sanctumRedisNamespace(): "production" | "preview" | "development" {
  const env = process.env.VERCEL_ENV;
  if (env === "production" || env === "preview" || env === "development") return env;
  if (!env && process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production") return "development";
  throw new Error("Unrecognized deployment environment");
}
