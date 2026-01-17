import { redis } from "@/lib/redis";

export type Feedback = {
  message: string;
  createdAt: string;
  userAgent: string;
};

const FEEDBACK_LIST_MAX_LENGTH = 1000;
const FEEDBACK_LIST_TTL_SECONDS = 60 * 60 * 24 * 90;

export async function storeFeedback(feedback: Feedback): Promise<void> {
  const key = "photo:feedback";
  const pipeline = redis.pipeline();
  pipeline.lpush(key, JSON.stringify(feedback));
  pipeline.ltrim(key, 0, FEEDBACK_LIST_MAX_LENGTH - 1);
  pipeline.expire(key, FEEDBACK_LIST_TTL_SECONDS);
  await pipeline.exec();
}
