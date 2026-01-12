"use client";

import { useEffect, useMemo, useState } from "react";

const A2HS_COOKIE_NAME = "a2hs-prompt-seen";
const COOKIE_EXPIRY_DAYS = 365;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);
  // iOS Safari is WebKit-based but not Chrome or Firefox on iOS
  return isIOS && isWebkit && !isChrome && !isFirefox;
}

export function useA2HSPrompt() {
  const initialState = useMemo(() => {
    if (typeof window === "undefined") {
      return { hasSeenPrompt: false, isStandalone: false, isIOS: false };
    }

    const hasSeenPrompt = !!getCookie(A2HS_COOKIE_NAME);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIOS = !hasSeenPrompt && !isStandalone && isIOSSafari();

    return { hasSeenPrompt, isStandalone, isIOS };
  }, []);

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [shouldShowNudge, setShouldShowNudge] = useState(initialState.isIOS);
  const isIOS = initialState.isIOS;

  useEffect(() => {
    if (initialState.hasSeenPrompt) return;

    if (initialState.isStandalone) {
      setCookie(A2HS_COOKIE_NAME, "true", COOKIE_EXPIRY_DAYS);
      return;
    }

    if (initialState.isIOS) return;

    // For other browsers, listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShouldShowNudge(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [initialState]);

  const showInstallPrompt = async () => {
    if (!deferredPrompt) {
      // If browser doesn't support the install prompt, just hide the nudge
      dismissNudge();
      return;
    }

    // Show the native install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // Clear the deferred prompt
    setDeferredPrompt(null);

    // Hide the nudge and set cookie
    dismissNudge();

    return outcome;
  };

  const dismissNudge = () => {
    setShouldShowNudge(false);
    setCookie(A2HS_COOKIE_NAME, "true", COOKIE_EXPIRY_DAYS);
  };

  return {
    shouldShowNudge,
    showInstallPrompt,
    dismissNudge,
    canInstall: !!deferredPrompt,
    isIOS,
  };
}

// Cookie utility functions
function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}
