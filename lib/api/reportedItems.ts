import { getDb } from "@/lib/mongodb/client";

const COLLECTION_NAME = "reports";
const REPORT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const REPORT_LIST_MAX_LENGTH = 200;

export type StoredReport = {
  itemId: string;
  clientId: string;
  reportId: string;
  filename: string | null;
  createdAt: Date;
};

let indexesEnsured = false;
let indexesEnsuring: Promise<void> | null = null;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  if (indexesEnsuring) return indexesEnsuring;

  indexesEnsuring = (async () => {
    const db = await getDb();
    const collection = db.collection<StoredReport>(COLLECTION_NAME);

    await Promise.all([
      collection.createIndex({ itemId: 1, createdAt: -1 }),
      collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: REPORT_TTL_SECONDS },
      ),
      collection.createIndex({ itemId: 1, clientId: 1, createdAt: -1 }),
      collection.createIndex({ reportId: 1 }, { unique: true }),
    ]);

    indexesEnsured = true;
    indexesEnsuring = null;
  })();

  return indexesEnsuring;
}

export async function hasRecentDuplicate(
  itemId: string,
  clientId: string,
  windowSeconds: number,
): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredReport>(COLLECTION_NAME);
  const cutoff = new Date(Date.now() - windowSeconds * 1000);

  const existing = await collection.findOne(
    { itemId, clientId, createdAt: { $gte: cutoff } },
    { projection: { _id: 1 } },
  );

  return Boolean(existing);
}

export async function addReport(doc: StoredReport): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredReport>(COLLECTION_NAME);

  await collection.insertOne(doc);

  // Enforce per-item cap (keep newest REPORT_LIST_MAX_LENGTH)
  const overflow = await collection
    .find(
      { itemId: doc.itemId },
      {
        projection: { _id: 1 },
        sort: { createdAt: -1 },
        skip: REPORT_LIST_MAX_LENGTH,
      },
    )
    .toArray();

  if (overflow.length > 0) {
    await collection.deleteMany({ _id: { $in: overflow.map((d) => d._id) } });
  }
}

export async function getReportedItemIds(): Promise<Set<string>> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredReport>(COLLECTION_NAME);
  const ids = await collection.distinct("itemId");
  return new Set(ids.map((id) => String(id)));
}

export async function isItemReported(itemId: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredReport>(COLLECTION_NAME);
  const existing = await collection.findOne(
    { itemId },
    { projection: { _id: 1 } },
  );
  return Boolean(existing);
}

export function excludeReportedItems<T extends { id: string | number }>(
  items: T[],
  reportedIds: Set<string>,
): T[] {
  return items.filter((item) => !reportedIds.has(String(item.id)));
}

export type PaginatedReports = {
  reports: StoredReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getReports(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedReports> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredReport>(COLLECTION_NAME);

  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    collection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(),
  ]);

  return {
    reports,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function deleteReport(reportId: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredReport>(COLLECTION_NAME);

  const result = await collection.deleteOne({ reportId });
  return result.deletedCount > 0;
}
