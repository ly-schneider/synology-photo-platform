"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PaginatedFeedback, StoredFeedback } from "@/lib/api/feedback";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const ITEMS_PER_PAGE = 20;

function formatDate(dateString: string | Date): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 border rounded-lg animate-pulse"
        >
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
          <div className="h-8 w-20 bg-muted rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

function FeedbackRow({
  feedback,
  onDelete,
  isDeleting,
}: {
  feedback: StoredFeedback;
  onDelete: (feedbackId: string) => void;
  isDeleting: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = () => {
    if (showConfirm) {
      onDelete(feedback._id.toString());
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm whitespace-pre-wrap break-words">
          {feedback.message}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
          <span>{formatDate(feedback.createdAtDate)}</span>
          <span className="truncate max-w-[200px]" title={feedback.userAgent}>
            {feedback.userAgent}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showConfirm ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              {isDeleting ? "..." : "Ja"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Nein
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Feedback löschen"
          >
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function FeedbackPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFeedback = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/feedback?page=${page}&limit=${ITEMS_PER_PAGE}`,
        );

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/admin/login");
            return;
          }
          throw new Error("Failed to fetch feedback");
        }

        const result = await response.json();
        setData(result);
      } catch {
        setError("Feedback konnte nicht geladen werden");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    fetchFeedback(currentPage);
  }, [fetchFeedback, currentPage]);

  const handleDelete = async (feedbackId: string) => {
    setDeletingId(feedbackId);

    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to delete feedback");
      }

      // Refresh the list
      await fetchFeedback(currentPage);
    } catch {
      setError("Feedback konnte nicht gelöscht werden");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (data && currentPage < data.totalPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <AdminNav />

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Benutzer-Feedback verwalten
          </p>
        </div>

        {isLoading && <TableSkeleton />}

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-destructive font-medium mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => fetchFeedback(currentPage)}
              >
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && data && (
          <>
            {data.feedback.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="text-muted-foreground">
                    Kein Feedback vorhanden
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.feedback.map((feedback) => (
                  <FeedbackRow
                    key={feedback._id.toString()}
                    feedback={feedback}
                    onDelete={handleDelete}
                    isDeleting={deletingId === feedback._id.toString()}
                  />
                ))}
              </div>
            )}

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Zurück
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {currentPage} von {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= data.totalPages}
                >
                  Weiter
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground mt-4">
              {data.total} Feedback-Eintrag{data.total !== 1 ? "e" : ""}{" "}
              insgesamt
            </p>
          </>
        )}
      </div>
    </div>
  );
}
