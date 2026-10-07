import { describe, expect, it } from "vitest";
import { isPlausibleEmail, loginErrorKey } from "./login-errors";

function authError(message: string, extra: { code?: string; status?: number; name?: string } = {}) {
  return Object.assign(new Error(message), { name: extra.name ?? "AuthApiError", ...extra });
}

describe("loginErrorKey", () => {
  it("detects disabled sign-ups (account does not exist)", () => {
    expect(loginErrorKey(authError("Signups not allowed for otp", { code: "otp_disabled", status: 422 }))).toBe(
      "notAllowed",
    );
  });

  it("detects rate limits", () => {
    expect(loginErrorKey(authError("Email rate limit exceeded", { code: "over_email_send_rate_limit", status: 429 }))).toBe(
      "rateLimited",
    );
  });

  it("detects wrong or expired codes", () => {
    expect(loginErrorKey(authError("Token has expired or is invalid", { code: "otp_expired", status: 403 }))).toBe(
      "invalidCode",
    );
  });

  it("detects network failures", () => {
    expect(loginErrorKey(authError("Failed to fetch", { name: "AuthRetryableFetchError", status: 0 }))).toBe("network");
  });

  it("detects wrong passwords", () => {
    expect(loginErrorKey(authError("Invalid login credentials", { code: "invalid_credentials", status: 400 }))).toBe(
      "invalidCredentials",
    );
  });
});

describe("isPlausibleEmail", () => {
  it("accepts normal addresses and rejects obvious typos", () => {
    expect(isPlausibleEmail("yo@gmail.com")).toBe(true);
    expect(isPlausibleEmail(" yo@gmail.com ")).toBe(true);
    expect(isPlausibleEmail("yo@gmail")).toBe(false);
    expect(isPlausibleEmail("yo gmail.com")).toBe(false);
  });
});
