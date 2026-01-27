"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsPeriod, StatsResponse } from "@/types/analytics";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import {
  Download01Icon,
  EyeIcon,
  Folder01Icon,
  Image01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "7d", label: "7 Tage" },
  { value: "30d", label: "30 Tage" },
  { value: "90d", label: "90 Tage" },
  { value: "all", label: "Gesamt" },
];

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: IconSvgElement;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">
              {value.toLocaleString("de-CH")}
            </p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <HugeiconsIcon
              icon={icon}
              className="h-5 w-5 text-muted-foreground"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-7 w-16 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-11 w-11 bg-muted animate-pulse rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

const ITEMS_PER_PAGE = 10;

function PopularListSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-4 w-16 bg-muted animate-pulse rounded shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PopularList({
  title,
  items,
  valueLabel,
  icon,
}: {
  title: string;
  items: Array<{ id: string; name: string; value: number }>;
  valueLabel: string;
  icon: IconSvgElement;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const maxValue = items.length > 0 ? Math.max(...items.map((i) => i.value)) : 0;
  const hasMore = items.length > ITEMS_PER_PAGE;

  const displayedItems = isExpanded
    ? items.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
    : items.slice(0, ITEMS_PER_PAGE);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  const handleShowMore = () => {
    setIsExpanded(true);
    setCurrentPage(0);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setCurrentPage(0);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={icon}
            className="h-4 w-4 text-muted-foreground"
          />
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            Keine Daten verfügbar
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {displayedItems.map((item) => {
                const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                return (
                  <div key={item.id} className="group relative">
                    <div
                      className="absolute inset-0 bg-muted/50 rounded-lg transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center gap-3">
                      <span
                        className="flex-1 min-w-0 text-sm font-medium break-words"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {item.value.toLocaleString("de-CH")} {valueLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More / Pagination Controls */}
            {hasMore && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {!isExpanded ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowMore}
                    className="w-full"
                  >
                    Mehr anzeigen
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      Zurück
                    </Button>
                    <div className="flex-1 text-center text-sm text-muted-foreground">
                      Seite {currentPage + 1} von {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Weiter
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Collapse button when expanded */}
            {isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCollapse}
                className="w-full mt-2 text-muted-foreground"
              >
                Weniger anzeigen
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState<StatsPeriod>("30d");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/analytics/stats?period=${period}`);

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
    } catch {
      setError("Statistiken konnten nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  }, [period, router]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Übersicht der Aktivitäten
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Abmelden
          </Button>
        </div>

        {/* Period Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PERIOD_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.value)}
              className="min-w-[70px]"
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <div className="space-y-4">
              <PopularListSkeleton title="Beliebte Ordner" />
              <PopularListSkeleton title="Beliebte Fotos (Aufrufe)" />
              <PopularListSkeleton title="Beliebte Fotos (Downloads)" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-destructive font-medium mb-4">{error}</p>
              <Button variant="outline" onClick={fetchStats}>
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Content */}
        {!isLoading && !error && stats && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="Besucher"
                value={stats.totalVisitors}
                icon={UserGroupIcon}
              />
              <StatCard
                title="Ordner-Aufrufe"
                value={stats.folderViews}
                icon={Folder01Icon}
              />
              <StatCard
                title="Foto-Aufrufe"
                value={stats.itemViews}
                icon={EyeIcon}
              />
              <StatCard
                title="Downloads"
                value={stats.downloads}
                icon={Download01Icon}
              />
            </div>

            {/* Popular Lists */}
            <div className="space-y-4">
              <PopularList
                title="Beliebte Ordner"
                items={stats.popularFolders.map((f) => ({
                  id: f.folderId,
                  name: f.folderName,
                  value: f.views,
                }))}
                valueLabel="Aufrufe"
                icon={Folder01Icon}
              />
              <PopularList
                title="Beliebte Fotos (Aufrufe)"
                items={stats.popularItemsByViews.map((i) => ({
                  id: i.itemId,
                  name: i.itemFilename,
                  value: i.views,
                }))}
                valueLabel="Aufrufe"
                icon={Image01Icon}
              />
              <PopularList
                title="Beliebte Fotos (Downloads)"
                items={stats.popularItemsByDownloads.map((i) => ({
                  id: i.itemId,
                  name: i.itemFilename,
                  value: i.downloads,
                }))}
                valueLabel="Downloads"
                icon={Download01Icon}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
