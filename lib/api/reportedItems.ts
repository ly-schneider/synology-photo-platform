import { redis } from "@/lib/redis";

export async function getReportedItemIds(): Promise<Set<string>> {
  const members = await redis.smembers("photo:reported_items");
  return new Set(members.map(String));
}

export async function isItemReported(itemId: string): Promise<boolean> {
  const result = await redis.sismember("photo:reported_items", itemId);
  return result === 1;
}

export function excludeReportedItems<T extends { id: string | number }>(
  items: T[],
  reportedIds: Set<string>,
): T[] {
  return items.filter((item) => !reportedIds.has(String(item.id)));
}
