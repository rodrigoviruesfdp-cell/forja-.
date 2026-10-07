import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { getSupabase } from "@/data/supabase/client";

export interface AuthUser {
  id: string;
  email: string | null;
}

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: AuthUser };

/** Must match the storageKey given to the Supabase client. */
const SESSION_STORAGE_KEY = "forja.auth";

let state: AuthState = { status: "loading" };
let initialized = false;
const listeners = new Set<() => void>();

function set(next: AuthState): void {
  const same =
    next.status === state.status &&
    (next.status !== "signed-in" || (state.status === "signed-in" && state.user.id === next.user.id));
  if (same) return;
  state = next;
  for (const listener of listeners) listener();
}

/**
 * The session is read straight from storage, without the network: a valid
 * refresh token means "signed in" even with no coverage. Supabase deletes it
 * (and emits SIGNED_OUT) only when the server really rejects it.
 */
function readStoredUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<Session> | null;
    const user = session?.user;
    return user?.id ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

function fromSession(event: AuthChangeEvent, session: Session | null): void {
  if (session?.user) {
    set({ status: "signed-in", user: { id: session.user.id, email: session.user.email ?? null } });
  } else if (event === "SIGNED_OUT") {
    set({ status: "signed-out" });
  }
}

/** Starts listening to Supabase auth. Safe to call more than once. */
export function initAuth(): void {
  if (initialized) return;
  initialized = true;

  const stored = readStoredUser();
  set(stored ? { status: "signed-in", user: stored } : { status: "signed-out" });

  // Never await Supabase calls inside this callback (it runs inside the client's lock).
  getSupabase().auth.onAuthStateChange((event, session) => fromSession(event, session));
}

export async function signOut(): Promise<void> {
  try {
    await getSupabase().auth.signOut({ scope: "local" });
  } finally {
    // Even offline the local session must go away.
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ status: "signed-out" });
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_STATE: AuthState = { status: "loading" };

export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
