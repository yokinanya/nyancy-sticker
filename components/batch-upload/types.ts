import type { StickerExt } from "@/lib/image-shared";

export type UploadMode = "direct" | "server";

export type UploadItemStatus =
  | "processing"
  | "ready"
  | "uploading"
  | "done"
  | "error"
  | "duplicate"
  | "invalid";

export interface UploadItem {
  readonly clientId: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly hash?: string;
  readonly width?: number;
  readonly height?: number;
  readonly ext: StickerExt | null;
  readonly name: string;
  readonly tags: string;
  readonly status: UploadItemStatus;
  readonly progress: number;
  readonly errorMsg?: string;
}

export type UploadItemPatch = Partial<
  Pick<
    UploadItem,
    | "hash"
    | "width"
    | "height"
    | "name"
    | "tags"
    | "status"
    | "progress"
    | "errorMsg"
  >
>;

export interface UploadSummary {
  readonly total: number;
  readonly ready: number;
  readonly done: number;
  readonly duplicate: number;
  readonly errored: number;
  readonly invalid: number;
  readonly uploadable: number;
  readonly totalProgress: number;
}

export interface StartUploadOptions {
  readonly endpoint: string;
  readonly category: string;
  readonly mode: UploadMode;
}

export type PatchUploadItem = (
  clientId: string,
  patch: UploadItemPatch,
) => void;
