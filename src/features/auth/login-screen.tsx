"use client";

import type { AuthError } from "@supabase/supabase-js";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { getSupabase } from "@/data/supabase/client";
import { setPrefs, usePrefs } from "@/features/preferences/prefs";
import { Wordmark } from "@/features/shell/wordmark";
import { LOCALES, type Locale } from "@/i18n/config";
import { useAuth } from "./auth-store";
import { isPlausibleEmail, type LoginErrorKey, loginErrorKey } from "./login-errors";

type Step = "email" | "code" | "password";

const RESEND_COOLDOWN_S = 60;
const LAST_EMAIL_KEY = "forja.lastEmail";

function readLastEmail(): string {
  try {
    return window.localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function LoginScreen() {
  const t = useTranslations("login");
  const router = useRouter();
  const auth = useAuth();
  const { locale } = usePrefs();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(readLastEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ key: LoginErrorKey; message: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (auth.status === "signed-in") router.replace("/today");
  }, [auth.status, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function fail(err: AuthError | Error) {
    setError({ key: loginErrorKey(err), message: err.message });
  }

  async function run(action: () => Promise<{ error: AuthError | null }>, onSuccess?: () => void) {
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await action();
      if (authError) fail(authError);
      else onSuccess?.();
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setBusy(false);
    }
  }

  function rememberEmail() {
    try {
      window.localStorage.setItem(LAST_EMAIL_KEY, email.trim());
    } catch {
      // ignore
    }
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (!isPlausibleEmail(email)) {
      setError({ key: "invalidEmail", message: "" });
      return;
    }
    rememberEmail();
    await run(
      () =>
        getSupabase().auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/confirm` },
        }),
      () => {
        setStep("code");
        setCode("");
        setCooldown(RESEND_COOLDOWN_S);
      },
    );
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError({ key: "invalidCode", message: "" });
      return;
    }
    await run(() => getSupabase().auth.verifyOtp({ email: email.trim(), token, type: "email" }));
  }

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    if (!isPlausibleEmail(email)) {
      setError({ key: "invalidEmail", message: "" });
      return;
    }
    rememberEmail();
    await run(() => getSupabase().auth.signInWithPassword({ email: email.trim(), password }));
  }

  function goTo(next: Step) {
    setError(null);
    setStep(next);
  }

  const errorText = error ? t(`errors.${error.key}`, { message: error.message }) : undefined;
  const languageOptions = LOCALES.map((value) => ({ value, label: value.toUpperCase() }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-safe pb-safe">
      <div className="flex items-center justify-between py-4">
        <Wordmark />
        <SegmentedControl<Locale>
          className="w-28"
          aria-label="Idioma / Language"
          value={locale}
          options={languageOptions}
          onValueChange={(value) => setPrefs({ locale: value })}
        />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-1 flex-col justify-center gap-8 pb-16"
      >
        {step === "code" ? (
          <form onSubmit={verifyCode} className="flex flex-col gap-6" noValidate>
            <div className="flex flex-col gap-2">
              <h1 className="text-large-title">{t("codeSentTitle")}</h1>
              <p className="text-muted-foreground">{t("codeSentBody", { email: email.trim() })}</p>
            </div>
            <Field label={t("codeLabel")} htmlFor="code" error={errorText}>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                autoFocus
                aria-invalid={Boolean(error)}
                className="numeric h-16 text-center text-title-1 tracking-[0.3em]"
                placeholder="······"
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? t("verifying") : t("signIn")}
            </Button>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" size="sm" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>
                {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => goTo("email")}>
                {t("changeEmail")}
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={step === "password" ? signInWithPassword : sendCode}
            className="flex flex-col gap-6"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <h1 className="text-large-title text-balance">{t("title")}</h1>
              {step === "email" ? <p className="text-muted-foreground">{t("subtitle")}</p> : null}
            </div>
            <Field label={t("emailLabel")} htmlFor="email" error={step === "email" ? errorText : undefined}>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                placeholder={t("emailPlaceholder")}
                aria-invalid={step === "email" && Boolean(error)}
              />
            </Field>
            {step === "password" ? (
              <Field label={t("passwordLabel")} htmlFor="password" error={errorText}>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                />
              </Field>
            ) : null}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {step === "password" ? (busy ? t("verifying") : t("signIn")) : busy ? t("sending") : t("sendCode")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="self-center"
              onClick={() => goTo(step === "password" ? "email" : "password")}
            >
              {step === "password" ? t("useCode") : t("usePassword")}
            </Button>
          </form>
        )}
      </motion.div>
    </main>
  );
}
