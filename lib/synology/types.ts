export type SynologyError = { code: number };

export type SynologyResponse<T> =
  | { success: true; data: T }
  | { success: false; error: SynologyError };

export type SynologySession = {
  sid: string;
  synotoken?: string;
  did?: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
};

export class SynologyApiError extends Error {
  public readonly code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.name = "SynologyApiError";
    this.code = code;
  }
}
