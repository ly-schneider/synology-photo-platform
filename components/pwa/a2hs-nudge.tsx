"use client";

import { useA2HSPrompt } from "@/hooks/use-a2hs-prompt";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Share03Icon } from "@hugeicons/core-free-icons";

export function A2HSNudge() {
  const { shouldShowNudge, showInstallPrompt, dismissNudge, canInstall, isIOS } =
    useA2HSPrompt();
  const isMobile = useIsMobile();

  // Only show the nudge on mobile devices
  if (!isMobile) {
    return null;
  }

  const handleInstall = async () => {
    if (canInstall) {
      await showInstallPrompt();
    } else {
      dismissNudge();
    }
  };

  const handleDismiss = () => {
    dismissNudge();
  };

  return (
    <Drawer open={shouldShowNudge} onOpenChange={(open: boolean) => !open && handleDismiss()}>
      <DrawerContent className="border-0 bg-white">
        <div className="flex flex-col items-center gap-6 p-6 pb-10">
          {/* Animated phone with icon */}
          <div className="relative flex h-32 w-20 items-center justify-center">
            {/* Phone frame */}
            <div className="absolute inset-0 rounded-2xl border-2 border-black/20 bg-black/5" />
            {/* App grid inside phone */}
            <div className="absolute inset-2 rounded-xl overflow-hidden">
              <div className="grid grid-cols-3 gap-1 p-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md bg-gradient-to-br from-blue-500/40 to-purple-500/40"
                  />
                ))}
              </div>
            </div>
            {/* Animated icon */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-bounce">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black">
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="h-4 w-4 text-white"
                  strokeWidth={2.5}
                />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <DrawerTitle className="text-lg font-semibold text-black">
              Zum Startbildschirm hinzufügen
            </DrawerTitle>
            {isIOS ? (
              <p className="text-sm text-black/60">
                Tippe auf{" "}
                <span className="inline-flex items-center gap-1 text-black translate-y-1">
                  <HugeiconsIcon icon={Share03Icon} className="h-4 w-4" />
                  Teilen
                </span>{" "}
                und dann{" "}
                <span className="font-medium text-black">&quot;Zum Home-Bildschirm&quot;</span>
              </p>
            ) : (
              <p className="text-sm text-black/60">
                Füge diese App zu deinem Startbildschirm hinzu für schnellen Zugriff auf deine Fotos.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="w-full space-y-3">
            {isIOS ? (
              <button
                onClick={handleDismiss}
                className="w-full rounded-2xl bg-black py-4 font-medium text-white transition-transform active:scale-[0.98]"
              >
                Verstanden
              </button>
            ) : (
              <>
                <button
                  onClick={handleInstall}
                  className="w-full rounded-2xl bg-black py-4 font-medium text-white transition-transform active:scale-[0.98]"
                >
                  Hinzufügen
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full text-sm text-black/50 transition-colors active:text-black/70"
                >
                  Später
                </button>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
