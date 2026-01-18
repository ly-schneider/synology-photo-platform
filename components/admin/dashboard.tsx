"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsPeriod, StatsResponse } from "@/types/analytics";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-9 w-16 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

function PopularListSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <li key={i} className="flex justify-between items-center">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PopularList({
  title,
  items,
  valueLabel,
}: {
  title: string;
  items: Array<{ id: string; name: string; value: number }>;
  valueLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data available</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center">
                <span className="truncate max-w-[200px]" title={item.name}>
                  {item.name}
                </span>
                <span className="text-muted-foreground text-sm">
                  {item.value.toLocaleString()} {valueLabel}
                </span>
              </li>
            ))}
          </ul>
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
      setError("Failed to load statistics");
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div className="flex gap-2 mb-8">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={period === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PopularListSkeleton title="Popular Folders" />
            <PopularListSkeleton title="Popular Items (Views)" />
            <PopularListSkeleton title="Popular Items (Downloads)" />
          </div>
        </>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <Button variant="outline" onClick={fetchStats} className="mt-4">
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Visitors" value={stats.totalVisitors} />
            <StatCard title="Folder Views" value={stats.folderViews} />
            <StatCard title="Item Views" value={stats.itemViews} />
            <StatCard title="Downloads" value={stats.downloads} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PopularList
              title="Popular Folders"
              items={stats.popularFolders.map((f) => ({
                id: f.folderId,
                name: f.folderName,
                value: f.views,
              }))}
              valueLabel="views"
            />
            <PopularList
              title="Popular Items (Views)"
              items={stats.popularItemsByViews.map((i) => ({
                id: i.itemId,
                name: i.itemFilename,
                value: i.views,
              }))}
              valueLabel="views"
            />
            <PopularList
              title="Popular Items (Downloads)"
              items={stats.popularItemsByDownloads.map((i) => ({
                id: i.itemId,
                name: i.itemFilename,
                value: i.downloads,
              }))}
              valueLabel="downloads"
            />
          </div>
        </>
      )}
    </div>
  );
}
