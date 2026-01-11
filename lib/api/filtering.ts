type SynoRecord = Record<string, unknown>;

const HIDE_TAG = "hide";
const HIDE_SUFFIX = "(hide)";

export function isHiddenFolderTitle(title: string): boolean {
  return title.trim().toLowerCase().endsWith(HIDE_SUFFIX);
}

export function isHiddenFolderEntry(entry: SynoRecord): boolean {
  const titleValue = entry.name ?? entry.title ?? entry.folder_name ?? entry.display_name;
  if (!titleValue) return false;
  return isHiddenFolderTitle(String(titleValue));
}

export function hasHideTag(entry: SynoRecord): boolean {
  const candidates = collectTagCandidates(entry);
  return candidates.some((candidate) => matchesTagName(candidate, HIDE_TAG));
}

export function ensureAdditionalIncludes(
  additional: string | null,
  required: string[],
): string | string[] {
  const requiredClean = required.map((value) => value.trim()).filter(Boolean);
  const trimmed = additional?.trim();
  if (!trimmed) return requiredClean;

  const existing = parseAdditionalList(trimmed);
  if (!existing) return requiredClean;

  const hasAllRequired = requiredClean.every((req) =>
    existing.some((value) => value.toLowerCase() === req.toLowerCase()),
  );
  if (hasAllRequired) return additional as string;

  const merged = [...existing];
  for (const req of requiredClean) {
    if (!merged.some((value) => value.toLowerCase() === req.toLowerCase())) {
      merged.push(req);
    }
  }
  return merged;
}

function parseAdditionalList(value: string): string[] | null {
  if (!value) return null;
  if (value.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry).trim()).filter(Boolean);
      }
      return null;
    } catch {
      return null;
    }
  }
  const split = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  return split.length > 0 ? split : null;
}

function collectTagCandidates(entry: SynoRecord): unknown[] {
  const candidates: unknown[] = [];
  appendTagCandidates(candidates, entry.tag);
  appendTagCandidates(candidates, entry.tags);
  appendTagCandidates(candidates, entry.tag_list);
  appendTagCandidates(candidates, entry.taglist);

  const additional = readRecord(entry.additional);
  appendTagCandidates(candidates, additional?.tag);
  appendTagCandidates(candidates, additional?.tags);
  appendTagCandidates(candidates, additional?.tag_list);
  appendTagCandidates(candidates, additional?.taglist);

  return candidates;
}

function appendTagCandidates(target: unknown[], value: unknown): void {
  if (!value) return;
  if (typeof value === "string") {
    target.push(value);
    return;
  }
  if (Array.isArray(value)) {
    target.push(...value);
    return;
  }
  if (typeof value === "object") {
    const record = value as SynoRecord;
    if (typeof record.name === "string") target.push(record.name);
    if (Array.isArray(record.list)) target.push(...record.list);
    if (Array.isArray(record.tags)) target.push(...record.tags);
    if (Array.isArray(record.tag)) target.push(...record.tag);
  }
}

function matchesTagName(value: unknown, tag: string): boolean {
  const target = tag.trim().toLowerCase();
  if (typeof value === "string") {
    return value.trim().toLowerCase() === target;
  }
  if (value && typeof value === "object") {
    const record = value as SynoRecord;
    const nameValue = record.name ?? record.tag ?? record.title;
    if (typeof nameValue === "string") {
      return nameValue.trim().toLowerCase() === target;
    }
  }
  return false;
}

function readRecord(value: unknown): SynoRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as SynoRecord;
}
