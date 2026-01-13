"use client";

import { usePlatform } from "@/hooks/use-platform";
import type { Item } from "@/types/api";
import { ArrowDown01Icon, Share01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

type ShareModalProps = {
  item: Item;
  onClose: () => void;
};

export function ShareModal({ item, onClose }: ShareModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const platform = usePlatform();
  const isIOS = platform === "ios";

  const imageUrl = item.downloadUrl ?? `/api/items/${item.id}/download`;

  const fetchBlob = async () => {
    const response = await fetch(imageUrl);
    return response.blob();
  };

  const handleShare = async () => {
    setIsLoading(true);

    try {
      const blob = await fetchBlob();
      const file = new File([blob], item.filename, { type: blob.type });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: item.filename,
        });
      }
    } catch {
      // User cancelled or share failed
    }

    onClose();
  };

  const handleDownload = async () => {
    setIsLoading(true);

    try {
      const blob = await fetchBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download failed
    }

    onClose();
  };

  const handlePrimaryAction = isIOS ? handleShare : handleDownload;
  const handleSecondaryAction = isIOS ? handleDownload : handleShare;

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-neutral-900 p-6 pb-10 animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {!isLoading ? (
          <div className="flex flex-col items-center gap-6">
            {/* Visual indicator */}
            <div className="relative flex h-32 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl border-2 border-white/20 bg-white/5" />
              <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30" />
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  <HugeiconsIcon
                    icon={isIOS ? Share01Icon : ArrowDown01Icon}
                    className="h-4 w-4 text-black"
                    strokeWidth={2.5}
                  />
                </div>
              </div>
            </div>

            {/* Instruction text */}
            <p className="text-center text-sm text-white/70">
              {isIOS ? (
                <>
                  Tippe <span className="font-medium text-white">Bild sichern</span>
                </>
              ) : (
                <>
                  Bild wird <span className="font-medium text-white">heruntergeladen</span>
                </>
              )}
            </p>

            {/* Primary action button */}
            <button
              onClick={handlePrimaryAction}
              className="w-full rounded-2xl bg-white py-4 font-medium text-black transition-transform active:scale-[0.98]"
            >
              {isIOS ? "Weiter" : "Herunterladen"}
            </button>

            {/* Secondary action (backup) - small text button */}
            <button
              onClick={handleSecondaryAction}
              className="text-sm text-white/50 underline underline-offset-2 transition-colors active:text-white/70"
            >
              {isIOS ? "Stattdessen herunterladen" : "Stattdessen teilen"}
            </button>

            {/* Cancel button */}
            <button
              onClick={onClose}
              className="text-sm text-white/50 transition-colors active:text-white/70"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white" />
            </div>
            <p className="text-sm text-white/70">
              {isIOS ? "Teilen wird geöffnet..." : "Download wird gestartet..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
