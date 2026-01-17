"use client";

import {
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

const MAX_MESSAGE_LENGTH = 5000;

type FeedbackModalProps = {
  onClose: () => void;
};

type ModalState = "idle" | "loading" | "success" | "error";

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [state, setState] = useState<ModalState>("idle");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const trimmedMessage = message.trim();
  const isOverLimit = message.length > MAX_MESSAGE_LENGTH;

  const handleSubmit = async () => {
    if (!trimmedMessage || isOverLimit) return;

    setState("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (response.ok) {
        setState("success");
        timeoutRef.current = setTimeout(() => onClose(), 1500);
      } else {
        const data = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setErrorMessage("Zu viele Anfragen. Bitte warte einen Moment.");
        } else {
          setErrorMessage(data.message || "Ein Fehler ist aufgetreten.");
        }
        setState("error");
      }
    } catch {
      setErrorMessage("Verbindungsfehler. Bitte versuche es erneut.");
      setState("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-neutral-900 p-6 pb-10 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {state === "idle" && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <p className="text-lg font-medium text-white">Feedback</p>
              <p className="mt-2 text-sm text-white/70">
                Teile uns dein Feedback mit
              </p>
            </div>

            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dein Feedback..."
                maxLength={MAX_MESSAGE_LENGTH}
                className={`min-h-[120px] w-full resize-none rounded-2xl bg-white/10 p-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${
                  isOverLimit
                    ? "ring-2 ring-red-500 focus:ring-red-500"
                    : "focus:ring-white/20"
                }`}
                autoFocus
              />
              <div
                className={`mt-1 text-right text-xs ${
                  isOverLimit ? "text-red-500" : "text-white/40"
                }`}
              >
                {message.length}/{MAX_MESSAGE_LENGTH}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!trimmedMessage || isOverLimit}
              className="w-full rounded-2xl bg-white py-4 font-medium text-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              Absenden
            </button>

            <button
              onClick={onClose}
              className="text-sm text-white/50 transition-colors active:text-white/70"
            >
              Abbrechen
            </button>
          </div>
        )}

        {state === "loading" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white" />
            </div>
            <p className="text-sm text-white/70">Feedback wird gesendet...</p>
          </div>
        )}

        {state === "success" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="h-8 w-8 text-green-500"
                strokeWidth={2}
              />
            </div>
            <p className="text-sm text-white/70">Danke für dein Feedback!</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                className="h-8 w-8 text-orange-500"
                strokeWidth={2}
              />
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-white">Fehler</p>
              <p className="mt-2 text-sm text-white/70">{errorMessage}</p>
            </div>

            <button
              onClick={() => setState("idle")}
              className="w-full rounded-2xl bg-white py-4 font-medium text-black transition-transform active:scale-[0.98]"
            >
              Erneut versuchen
            </button>

            <button
              onClick={onClose}
              className="text-sm text-white/50 transition-colors active:text-white/70"
            >
              Abbrechen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
