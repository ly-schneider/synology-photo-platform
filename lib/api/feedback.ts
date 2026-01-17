import { redis } from "@/lib/redis";

export type Feedback = {
  message: string;
  createdAt: string;
  userAgent: string;
};

export async function storeFeedback(feedback: Feedback): Promise<void> {
  await redis.lpush("photo:feedback", JSON.stringify(feedback));
}
