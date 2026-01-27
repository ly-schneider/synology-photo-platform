export type AnalyticsEventType =
  | "folder_view"
  | "item_view"
  | "item_download"
  | "visitor";

export type AnalyticsEvent = {
  type: AnalyticsEventType;
  folderId?: string;
  folderName?: string;
  folderPath?: string[];
  itemId?: string;
  itemFilename?: string;
  visitorId: string;
  timestamp?: Date;
  date?: string;
};

export type TrackEventRequest = {
  type: "folder_view" | "item_view";
  folderId?: string;
  folderName?: string;
  folderPath?: string[];
  itemId?: string;
  itemFilename?: string;
};

export type StatsPeriod = "7d" | "30d" | "90d" | "all";

export type StatsResponse = {
  totalVisitors: number;
  folderViews: number;
  itemViews: number;
  downloads: number;
  popularFolders: Array<{
    folderId: string;
    folderName: string;
    views: number;
  }>;
  popularItemsByViews: Array<{
    itemId: string;
    itemFilename: string;
    folderId: string;
    folderPath: string[];
    views: number;
  }>;
  popularItemsByDownloads: Array<{
    itemId: string;
    itemFilename: string;
    folderId: string;
    folderPath: string[];
    downloads: number;
  }>;
};
