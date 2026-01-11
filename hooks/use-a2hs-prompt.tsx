"use client";

import { useEffect, useState } from "react";

const A2HS_COOKIE_NAME = "a2hs-prompt-seen";
const COOKIE_EXPIRY_DAYS = 365;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useA2HSPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [shouldShowNudge, setShouldShowNudge] = useState(false);

  useEffect(() => {
    // Check if the prompt has been seen before
    const hasSeenPrompt = getCookie(A2HS_COOKIE_NAME);

    if (hasSeenPrompt) {
      return;
    }

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // App is already installed
      setCookie(A2HS_COOKIE_NAME, "true", COOKIE_EXPIRY_DAYS);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom nudge
      setShouldShowNudge(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

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
