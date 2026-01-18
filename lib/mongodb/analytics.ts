import type { AnalyticsEvent, StatsPeriod, StatsResponse } from "@/types/analytics";
import { getDb } from "./client";

const COLLECTION_NAME = "analytics_events";

let indexesEnsured = false;
let indexesEnsuring: Promise<void> | null = null;

async function maybeEnsureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  if (indexesEnsuring) return indexesEnsuring;

  indexesEnsuring = ensureIndexes().then(() => {
    indexesEnsured = true;
    indexesEnsuring = null;
  });

  return indexesEnsuring;
}

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const db = await getDb();
    maybeEnsureIndexes().catch(() => {});
    const now = new Date();
    await db.collection(COLLECTION_NAME).insertOne({
      ...event,
      timestamp: now,
      date: now.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Analytics tracking failed:", error);
  }
}

export async function trackVisitor(visitorId: string): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  try {
    const db = await getDb();
    maybeEnsureIndexes().catch(() => {});
    await db.collection(COLLECTION_NAME).updateOne(
      { type: "visitor", visitorId, date },
      {
        $setOnInsert: {
          type: "visitor",
          visitorId,
          date,
          timestamp: new Date(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("Visitor tracking failed:", error);
  }
}

export async function trackDownload(
  itemId: string,
  itemFilename: string,
  visitorId: string,
): Promise<void> {
  await trackEvent({
    type: "item_download",
    itemId,
    itemFilename,
    visitorId,
  });
}

function getDateFilter(period: StatsPeriod): Date | null {
  if (period === "all") return null;

  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date;
}

export async function getStats(period: StatsPeriod): Promise<StatsResponse> {
  const db = await getDb();
  const collection = db.collection(COLLECTION_NAME);
  const dateFilter = getDateFilter(period);
  const matchStage = dateFilter ? { timestamp: { $gte: dateFilter } } : {};

  const [
    totalVisitors,
    folderViews,
    itemViews,
    downloads,
    popularFolders,
    popularItemsByViews,
    popularItemsByDownloads,
  ] = await Promise.all([
    collection.countDocuments({ type: "visitor", ...matchStage }),
    collection.countDocuments({ type: "folder_view", ...matchStage }),
    collection.countDocuments({ type: "item_view", ...matchStage }),
    collection.countDocuments({ type: "item_download", ...matchStage }),
    collection
      .aggregate<{ _id: string; folderName: string; views: number }>([
        { $match: { type: "folder_view", ...matchStage } },
        {
          $group: {
            _id: "$folderId",
            folderName: { $first: "$folderName" },
            views: { $sum: 1 },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    collection
      .aggregate<{ _id: string; itemFilename: string; views: number }>([
        { $match: { type: "item_view", ...matchStage } },
        {
          $group: {
            _id: "$itemId",
            itemFilename: { $first: "$itemFilename" },
            views: { $sum: 1 },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    collection
      .aggregate<{ _id: string; itemFilename: string; downloads: number }>([
        { $match: { type: "item_download", ...matchStage } },
        {
          $group: {
            _id: "$itemId",
            itemFilename: { $first: "$itemFilename" },
            downloads: { $sum: 1 },
          },
        },
        { $sort: { downloads: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
  ]);

  return {
    totalVisitors,
    folderViews,
    itemViews,
    downloads,
    popularFolders: popularFolders.map((f) => ({
      folderId: f._id,
      folderName: f.folderName || "Unknown",
      views: f.views,
    })),
    popularItemsByViews: popularItemsByViews.map((i) => ({
      itemId: i._id,
      itemFilename: i.itemFilename || "Unknown",
      views: i.views,
    })),
    popularItemsByDownloads: popularItemsByDownloads.map((i) => ({
      itemId: i._id,
      itemFilename: i.itemFilename || "Unknown",
      downloads: i.downloads,
    })),
  };
}

export async function ensureIndexes(): Promise<void> {
  try {
    const db = await getDb();
    const collection = db.collection(COLLECTION_NAME);

    await Promise.all([
      collection.createIndex({ type: 1, timestamp: -1 }),
      collection.createIndex({ type: 1, folderId: 1 }),
      collection.createIndex({ type: 1, itemId: 1 }),
      collection.createIndex(
        { type: 1, visitorId: 1, date: 1 },
        { unique: true, partialFilterExpression: { type: "visitor" } },
      ),
      collection.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 365 * 24 * 60 * 60 },
      ),
    ]);
  } catch (error) {
    console.error("Failed to ensure indexes:", error);
  }
}
