"use client";

import { useA2HSPrompt } from "@/hooks/use-a2hs-prompt";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function A2HSNudge() {
  const { shouldShowNudge, showInstallPrompt, dismissNudge, canInstall } =
    useA2HSPrompt();
  const isMobile = useIsMobile();

  // Only show the nudge on mobile devices
  if (!isMobile) {
    return null;
  }

  const handleInstall = async () => {
    if (canInstall) {
      // Show native install prompt
      await showInstallPrompt();
    } else {
      // Browser doesn't support install prompt, provide manual instructions
      // For now, just dismiss the nudge
      dismissNudge();
    }
  };

  const handleDismiss = () => {
    dismissNudge();
  };

  return (
    <Dialog open={shouldShowNudge} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Home Screen</DialogTitle>
          <DialogDescription>
            Install this app on your device for quick and easy access when
            you&apos;re on the go.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <p className="text-sm text-muted-foreground">
            Get the best experience by adding this app to your home screen:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Launch directly from your home screen</li>
            <li>Full-screen experience without browser UI</li>
            <li>Faster access to your photos</li>
            <li>Works offline</li>
          </ul>
        </div>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleInstall} className="w-full">
            Add to Home Screen
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
