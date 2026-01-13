import type { SynologySession } from "./types";

/**
 * Simple in-memory session store with short TTL and login mutex.
 *
 * Per-request authentication strategy:
 * - Sessions live only 5 seconds (enough for parallel API calls within one request)
 * - No Redis storage - avoids cross-IP session sharing issues with Vercel
 * - Login mutex ensures only one login happens at a time
 */

const SESSION_TTL_MS = 5000; // 5 seconds

let cachedSession: SynologySession | null = null;
let sessionExpiresAt = 0;

// Mutex: if a login is in progress, this holds the promise
let loginInProgress: Promise<SynologySession> | null = null;

export function getSession(): SynologySession | null {
  if (cachedSession && Date.now() < sessionExpiresAt) {
    return cachedSession;
  }
  // Session expired or doesn't exist
  cachedSession = null;
  return null;
}

export function setSession(session: SynologySession): void {
  cachedSession = session;
  sessionExpiresAt = Date.now() + SESSION_TTL_MS;
}

export function clearSession(): void {
  cachedSession = null;
  sessionExpiresAt = 0;
}

/**
 * Execute a login function with mutex protection.
 * If a login is already in progress, wait for it instead of starting another.
 */
export async function withLoginMutex(
  loginFn: () => Promise<SynologySession>,
): Promise<SynologySession> {
  // Check if we already have a valid session
  const existing = getSession();
  if (existing) return existing;

  // If login is in progress, wait for it
  if (loginInProgress) {
    return loginInProgress;
  }

  // Start login and store the promise so others can wait
  loginInProgress = loginFn().finally(() => {
    loginInProgress = null;
  });

  return loginInProgress;
}
