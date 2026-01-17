"use client";

import type { Item } from "@/types/api";
import {
  Alert02Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";

type ReportModalProps = {
  item: Item;
  onClose: () => void;
  onReportSuccess: (itemId: string) => void;
};

type ModalState = "idle" | "loading" | "success" | "error";

export function ReportModal({
  item,
  onClose,
  onReportSuccess,
}: ReportModalProps) {
  const [state, setState] = useState<ModalState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleReport = async () => {
    setState("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, filename: item.filename }),
      });

      if (response.ok) {
        setState("success");
        onReportSuccess(item.id);
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

  useEffect(() => {
    if (state !== "success") return;
    const timeoutId = window.setTimeout(onClose, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [state, onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-neutral-900 p-6 pb-10 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {state === "idle" && (
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <HugeiconsIcon
                icon={Alert02Icon}
                className="h-8 w-8 text-red-500"
                strokeWidth={2}
              />
            </div>

            <div className="text-center">
              <p className="text-lg font-medium text-white">Foto melden</p>
              <p className="mt-2 text-sm text-white/70">
                Dieses Foto als unangemessen markieren?
              </p>
            </div>

            <button
              onClick={handleReport}
              className="w-full rounded-2xl bg-red-600 py-4 font-medium text-white transition-transform active:scale-[0.98]"
            >
              Melden
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
            <p className="text-sm text-white/70">Meldung wird gesendet...</p>
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
            <p className="text-sm text-white/70">Foto wurde gemeldet</p>
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
              onClick={handleReport}
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
