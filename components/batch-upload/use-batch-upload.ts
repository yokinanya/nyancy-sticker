"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { filesFromDataTransfer } from "@/lib/dropped-files";
import {
  createUploadItems,
  processUploadItems,
  type ProcessingResult,
} from "./processing";
import { uploadQueue } from "./transport";
import type {
  PatchUploadItem,
  StartUploadOptions,
  UploadItem,
  UploadItemPatch,
  UploadSummary,
} from "./types";

interface UploadState {
  readonly order: readonly string[];
  readonly byId: Readonly<Record<string, UploadItem>>;
  readonly uploading: boolean;
  readonly batchIds: readonly string[];
}

type UploadAction =
  | { readonly type: "add"; readonly items: readonly UploadItem[] }
  | { readonly type: "patch"; readonly id: string; readonly patch: UploadItemPatch }
  | { readonly type: "remove"; readonly id: string }
  | { readonly type: "clear" }
  | { readonly type: "start"; readonly ids: readonly string[] }
  | { readonly type: "finish" };

const INITIAL_STATE: UploadState = {
  order: [],
  byId: {},
  uploading: false,
  batchIds: [],
};

export interface BatchUploadController {
  readonly items: readonly UploadItem[];
  readonly summary: UploadSummary;
  readonly uploading: boolean;
  addFiles(files: readonly File[]): Promise<ProcessingResult>;
  addDroppedFiles(dataTransfer: DataTransfer): Promise<ProcessingResult>;
  patchItem: PatchUploadItem;
  removeItem(clientId: string): void;
  clearItems(): void;
  startUpload(options: StartUploadOptions): Promise<void>;
}

export function useBatchUpload(): BatchUploadController {
  const [state, dispatch] = useReducer(uploadReducer, INITIAL_STATE);
  const { ownedUrls, stateRef } = useUploadRefs(state);
  const patchItem = useCallback<PatchUploadItem>((clientId, patch) => {
    dispatch({ type: "patch", id: clientId, patch });
  }, []);
  const fileCommands = useFileCommands({ dispatch, ownedUrls, patchItem });
  const queueCommands = useQueueCommands({ dispatch, ownedUrls, patchItem, stateRef });
  const items = useMemo(
    () => state.order.map((id) => state.byId[id]).filter(Boolean),
    [state.byId, state.order],
  );
  const summary = useMemo(() => summarizeUploads(state, items), [items, state]);
  return { items, summary, uploading: state.uploading, patchItem, ...fileCommands, ...queueCommands };
}

function useUploadRefs(state: UploadState) {
  const stateRef = useRef(state);
  const ownedUrls = useRef(new Set<string>());
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => () => {
    for (const url of ownedUrls.current) URL.revokeObjectURL(url);
    ownedUrls.current.clear();
  }, []);
  return { ownedUrls, stateRef };
}

function useFileCommands({ dispatch, ownedUrls, patchItem }: {
  readonly dispatch: React.Dispatch<UploadAction>;
  readonly ownedUrls: React.RefObject<Set<string>>;
  readonly patchItem: PatchUploadItem;
}) {
  const addFiles = useCallback(async (files: readonly File[]) => {
    const items = createUploadItems(files);
    items.forEach((item) => ownedUrls.current.add(item.previewUrl));
    dispatch({ type: "add", items });
    return processUploadItems(items, patchItem);
  }, [dispatch, ownedUrls, patchItem]);

  const addDroppedFiles = useCallback(async (dataTransfer: DataTransfer) => {
    const files = await filesFromDataTransfer(dataTransfer);
    return addFiles(files);
  }, [addFiles]);
  return { addDroppedFiles, addFiles };
}

function useQueueCommands({ dispatch, ownedUrls, patchItem, stateRef }: {
  readonly dispatch: React.Dispatch<UploadAction>;
  readonly ownedUrls: React.RefObject<Set<string>>;
  readonly patchItem: PatchUploadItem;
  readonly stateRef: React.RefObject<UploadState>;
}) {
  const removeItem = useCallback((clientId: string) => {
    const item = stateRef.current.byId[clientId];
    if (item) revokeOwnedUrl(item.previewUrl, ownedUrls.current);
    dispatch({ type: "remove", id: clientId });
  }, [dispatch, ownedUrls, stateRef]);

  const clearItems = useCallback(() => {
    for (const url of ownedUrls.current) URL.revokeObjectURL(url);
    ownedUrls.current.clear();
    dispatch({ type: "clear" });
  }, [dispatch, ownedUrls]);

  const startUpload = useCallback(async (uploadOptions: StartUploadOptions) => {
    const items = selectUploadableItems(stateRef.current);
    if (items.length === 0) throw new Error("没有可上传的图片。");
    dispatch({ type: "start", ids: items.map((item) => item.clientId) });
    try {
      await uploadQueue({ ...uploadOptions, items, onItemPatch: patchItem });
    } finally {
      dispatch({ type: "finish" });
    }
  }, [dispatch, patchItem, stateRef]);
  return { clearItems, removeItem, startUpload };
}

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  if (action.type === "add") return addItems(state, action.items);
  if (action.type === "patch") return patchItem(state, action.id, action.patch);
  if (action.type === "remove") return removeItem(state, action.id);
  if (action.type === "clear") return INITIAL_STATE;
  if (action.type === "start") {
    return { ...state, uploading: true, batchIds: action.ids };
  }
  return { ...state, uploading: false, batchIds: [] };
}

function addItems(state: UploadState, items: readonly UploadItem[]): UploadState {
  if (items.length === 0) return state;
  const additions = Object.fromEntries(items.map((item) => [item.clientId, item]));
  return {
    ...state,
    order: [...state.order, ...items.map((item) => item.clientId)],
    byId: { ...state.byId, ...additions },
  };
}

function patchItem(
  state: UploadState,
  id: string,
  patch: UploadItemPatch,
): UploadState {
  const item = state.byId[id];
  if (!item || !hasPatchChanges(item, patch)) return state;
  return {
    ...state,
    byId: { ...state.byId, [id]: { ...item, ...patch } },
  };
}

function removeItem(state: UploadState, id: string): UploadState {
  if (!state.byId[id]) return state;
  const byId = { ...state.byId };
  delete byId[id];
  return {
    ...state,
    order: state.order.filter((itemId) => itemId !== id),
    byId,
  };
}

function hasPatchChanges(item: UploadItem, patch: UploadItemPatch): boolean {
  return Object.entries(patch).some(([key, value]) => {
    return item[key as keyof UploadItem] !== value;
  });
}

function selectUploadableItems(state: UploadState): UploadItem[] {
  return state.order
    .map((id) => state.byId[id])
    .filter((item) => item.status === "ready" || item.status === "error");
}

function summarizeUploads(
  state: UploadState,
  items: readonly UploadItem[],
): UploadSummary {
  const summary = items.reduce(
    (current, item) => incrementStatus(current, item),
    { ready: 0, done: 0, duplicate: 0, errored: 0, invalid: 0 },
  );
  const batch = new Set(state.batchIds);
  const progress = state.uploading && batch.size > 0
    ? items.reduce((total, item) => total + (batch.has(item.clientId) ? item.progress : 0), 0)
    : 0;
  return {
    total: items.length,
    ...summary,
    uploadable: summary.ready + summary.errored,
    totalProgress: batch.size > 0 ? Math.round(progress / batch.size) : 0,
  };
}

function incrementStatus(
  summary: Omit<UploadSummary, "total" | "uploadable" | "totalProgress">,
  item: UploadItem,
) {
  if (item.status === "ready") return { ...summary, ready: summary.ready + 1 };
  if (item.status === "done") return { ...summary, done: summary.done + 1 };
  if (item.status === "duplicate") return { ...summary, duplicate: summary.duplicate + 1 };
  if (item.status === "error") return { ...summary, errored: summary.errored + 1 };
  if (item.status === "invalid") return { ...summary, invalid: summary.invalid + 1 };
  return summary;
}

function revokeOwnedUrl(url: string, ownedUrls: Set<string>): void {
  if (!ownedUrls.delete(url)) return;
  URL.revokeObjectURL(url);
}
