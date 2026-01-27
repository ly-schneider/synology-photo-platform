"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PaginatedReports, StoredReport } from "@/lib/api/reportedItems";
import {
  Delete02Icon,
  LinkSquare01FreeIcons,
} from "@hugeicons/core-free-icons";
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

const SYNOLOGY_PHOTO_SEARCH_BASE = "http://photo.icf-bern.ch/photo/#/search";

function buildPhotoLink(report: StoredReport): string | null {
  if (!report.filename) {
    return null;
  }
  return `${SYNOLOGY_PHOTO_SEARCH_BASE}/keyword=${encodeURIComponent(report.filename)}/shared_space`;
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border rounded-lg animate-pulse"
        >
          <div className="flex-1 min-w-0">
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
          <div className="h-4 w-32 bg-muted rounded shrink-0" />
          <div className="h-8 w-20 bg-muted rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

function ReportRow({
  report,
  onDelete,
  isDeleting,
}: {
  report: StoredReport;
  onDelete: (reportId: string) => void;
  isDeleting: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const photoLink = buildPhotoLink(report);

  const handleDeleteClick = () => {
    if (showConfirm) {
      onDelete(report.reportId);
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          title={report.filename ?? report.itemId}
        >
          {report.filename ?? `Item ${report.itemId}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          ID: {report.itemId}
        </p>
      </div>

      <div className="text-xs text-muted-foreground shrink-0">
        {formatDate(report.createdAt)}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {photoLink && (
          <a
            href={photoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Foto anzeigen"
          >
            <HugeiconsIcon
              icon={LinkSquare01FreeIcons}
              className="h-4 w-4 text-muted-foreground hover:text-foreground"
            />
          </a>
        )}

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
            title="Meldung entfernen"
          >
            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/reports?page=${page}&limit=${ITEMS_PER_PAGE}`,
        );

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/admin/login");
            return;
          }
          throw new Error("Failed to fetch reports");
        }

        const result = await response.json();
        setData(result);
      } catch {
        setError("Meldungen konnten nicht geladen werden");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    fetchReports(currentPage);
  }, [fetchReports, currentPage]);

  const handleDelete = async (reportId: string) => {
    setDeletingId(reportId);

    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to delete report");
      }

      // Refresh the list
      await fetchReports(currentPage);
    } catch {
      setError("Meldung konnte nicht entfernt werden");
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
          <h1 className="text-2xl font-bold tracking-tight">Meldungen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gemeldete Fotos verwalten
          </p>
        </div>

        {isLoading && <TableSkeleton />}

        {error && (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-destructive font-medium mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => fetchReports(currentPage)}
              >
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && data && (
          <>
            {data.reports.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <p className="text-muted-foreground">
                    Keine Meldungen vorhanden
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {data.reports.map((report) => (
                  <ReportRow
                    key={report.reportId}
                    report={report}
                    onDelete={handleDelete}
                    isDeleting={deletingId === report.reportId}
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
              {data.total} Meldung{data.total !== 1 ? "en" : ""} insgesamt
            </p>
          </>
        )}
      </div>
    </div>
  );
}
