import type { AuthError } from "@supabase/supabase-js";

export type LoginErrorKey =
  | "invalidEmail"
  | "notAllowed"
  | "rateLimited"
  | "invalidCode"
  | "invalidCredentials"
  | "network"
  | "generic";

/** Maps Supabase Auth errors to messages the user can act on. */
export function loginErrorKey(error: AuthError | Error): LoginErrorKey {
  const code = "code" in error ? (error.code as string | undefined) : undefined;
  const status = "status" in error ? (error.status as number | undefined) : undefined;
  const message = error.message.toLowerCase();

  if (error.name === "AuthRetryableFetchError" || status === 0 || message.includes("fetch")) return "network";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429) {
    return "rateLimited";
  }
  if (code === "otp_expired" || code === "invalid_otp" || message.includes("token has expired or is invalid")) {
    return "invalidCode";
  }
  if (code === "invalid_credentials") return "invalidCredentials";
  if (
    code === "signup_disabled" ||
    code === "otp_disabled" ||
    code === "user_not_found" ||
    message.includes("signups not allowed")
  ) {
    return "notAllowed";
  }
  if (code === "validation_failed" || code === "email_address_invalid") return "invalidEmail";
  return "generic";
}

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
