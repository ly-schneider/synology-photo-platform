import { getDb } from "@/lib/mongodb/client";
import { ObjectId } from "mongodb";

export type Feedback = {
  message: string;
  createdAt: string;
  userAgent: string;
};

type FeedbackDocument = Feedback & {
  createdAtDate: Date;
};

export type StoredFeedback = FeedbackDocument & {
  _id: ObjectId;
};

const COLLECTION_NAME = "feedback";
const FEEDBACK_LIST_MAX_LENGTH = 1000;
const FEEDBACK_TTL_SECONDS = 60 * 60 * 24 * 90;

let indexesEnsured = false;
let indexesEnsuring: Promise<void> | null = null;

async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  if (indexesEnsuring) return indexesEnsuring;

  indexesEnsuring = (async () => {
    const db = await getDb();
    const collection = db.collection<FeedbackDocument>(COLLECTION_NAME);

    await Promise.all([
      collection.createIndex(
        { createdAtDate: 1 },
        {
          expireAfterSeconds: FEEDBACK_TTL_SECONDS,
        },
      ),
      collection.createIndex({ createdAtDate: -1 }),
    ]);

    indexesEnsured = true;
    indexesEnsuring = null;
  })();

  return indexesEnsuring;
}

export async function storeFeedback(feedback: Feedback): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<FeedbackDocument>(COLLECTION_NAME);

  const createdAtDate = new Date(feedback.createdAt);
  await collection.insertOne({ ...feedback, createdAtDate });

  const overflow = await collection
    .find(
      {},
      {
        projection: { _id: 1 },
        sort: { createdAtDate: -1 },
        skip: FEEDBACK_LIST_MAX_LENGTH,
      },
    )
    .toArray();
  if (overflow.length > 0) {
    await collection.deleteMany({
      _id: { $in: overflow.map((doc) => doc._id) },
    });
  }
}

export type PaginatedFeedback = {
  feedback: StoredFeedback[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getFeedback(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedFeedback> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredFeedback>(COLLECTION_NAME);

  const skip = (page - 1) * limit;

  const [feedback, total] = await Promise.all([
    collection
      .find({})
      .sort({ createdAtDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(),
  ]);

  return {
    feedback,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function deleteFeedback(feedbackId: string): Promise<boolean> {
  await ensureIndexes();
  const db = await getDb();
  const collection = db.collection<StoredFeedback>(COLLECTION_NAME);

  if (!ObjectId.isValid(feedbackId)) {
    return false;
  }

  const result = await collection.deleteOne({ _id: new ObjectId(feedbackId) });
  return result.deletedCount > 0;
}
