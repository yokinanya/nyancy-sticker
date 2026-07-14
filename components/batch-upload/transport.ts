import { baseName } from "@/lib/image-shared";
import type {
  PatchUploadItem,
  UploadItem,
  UploadMode,
} from "./types";

export const UPLOAD_CONCURRENCY = 3;

const PERCENT_MAX = 100;
const HTTP_SUCCESS_MIN = 200;
const HTTP_SUCCESS_MAX = 300;

interface UploadOneOptions {
  readonly item: UploadItem;
  readonly endpoint: string;
  readonly category: string;
  readonly mode: UploadMode;
  readonly onProgress: (progress: number) => void;
}

interface UploadQueueOptions {
  readonly items: readonly UploadItem[];
  readonly endpoint: string;
  readonly category: string;
  readonly mode: UploadMode;
  readonly onItemPatch: PatchUploadItem;
}

interface PresignSuccess {
  readonly key: string;
  readonly uploadUrl: string;
  readonly headers: Readonly<Record<string, string>>;
}

export async function uploadQueue(options: UploadQueueOptions): Promise<void> {
  let nextIndex = 0;
  const errors: Error[] = [];
  const workerCount = Math.min(UPLOAD_CONCURRENCY, options.items.length);
  const runWorker = async () => {
    while (nextIndex < options.items.length) {
      const item = options.items[nextIndex];
      nextIndex += 1;
      try {
        await uploadQueueItem(options, item);
      } catch (error) {
        errors.push(asError(error, `上传失败：${item.file.name}`));
      }
    }
  };
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} 张图片上传失败。`);
  }
}

async function uploadQueueItem(
  options: UploadQueueOptions,
  item: UploadItem,
): Promise<void> {
  options.onItemPatch(item.clientId, {
    status: "uploading",
    progress: 0,
    errorMsg: undefined,
  });
  try {
    await uploadOne({
      item,
      endpoint: options.endpoint,
      category: options.category,
      mode: options.mode,
      onProgress: (progress) => options.onItemPatch(item.clientId, { progress }),
    });
    options.onItemPatch(item.clientId, {
      status: "done",
      progress: PERCENT_MAX,
    });
  } catch (error) {
    options.onItemPatch(item.clientId, {
      status: "error",
      errorMsg: asError(error, "上传失败").message,
    });
    throw error;
  }
}

async function uploadOne(options: UploadOneOptions): Promise<void> {
  if (await importExistingUpload(options)) return;
  if (options.mode === "server") return serverRelayUpload(options);
  return presignUpload(options);
}

async function presignUpload(options: UploadOneOptions): Promise<void> {
  const presigned = await requestPresignedUpload(options);
  await putFileToR2({
    file: options.item.file,
    presigned,
    onProgress: options.onProgress,
  });
  await completeUpload(options, presigned.key);
}

async function importExistingUpload(options: UploadOneOptions): Promise<boolean> {
  if (!options.item.hash) return false;
  const response = await fetch(`${options.endpoint}/import-existing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: options.category,
      fileName: options.item.file.name,
      hash: options.item.hash,
      name: itemName(options.item),
      tags: options.item.tags,
    }),
  });
  const result = await readJsonRecord(response, "导入已有图片");
  assertSuccessfulResult(response, result);
  if (typeof result.imported !== "boolean") {
    throw new Error("导入已有图片响应缺少 imported。");
  }
  return result.imported;
}

async function requestPresignedUpload(
  options: UploadOneOptions,
): Promise<PresignSuccess> {
  const response = await fetch(`${options.endpoint}/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: options.category,
      contentType: options.item.file.type,
      fileName: options.item.file.name,
      size: options.item.file.size,
    }),
  });
  const result = await readJsonRecord(response, "请求上传地址");
  assertSuccessfulResult(response, result);
  if (typeof result.key !== "string" || typeof result.uploadUrl !== "string") {
    throw new Error("上传地址响应缺少 key 或 uploadUrl。");
  }
  return {
    key: result.key,
    uploadUrl: result.uploadUrl,
    headers: readStringRecord(result.headers, "上传地址响应 headers 无效。"),
  };
}

function putFileToR2(options: {
  readonly file: File;
  readonly presigned: PresignSuccess;
  readonly onProgress: (progress: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", options.presigned.uploadUrl);
    Object.entries(options.presigned.headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.upload.onprogress = (event) => reportProgress(event, options.onProgress);
    xhr.onload = () => {
      if (isSuccessfulStatus(xhr.status)) resolve();
      else reject(new Error(`R2 上传失败：HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("R2 上传网络错误"));
    xhr.send(options.file);
  });
}

async function completeUpload(
  options: UploadOneOptions,
  key: string,
): Promise<void> {
  const response = await fetch(`${options.endpoint}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: options.category,
      fileName: options.item.file.name,
      key,
      name: itemName(options.item),
      tags: options.item.tags,
    }),
  });
  const result = await readJsonRecord(response, "完成上传");
  assertSuccessfulResult(response, result);
}

function serverRelayUpload(options: UploadOneOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = new FormData();
    data.set("file", options.item.file);
    data.set("category", options.category);
    data.set("name", itemName(options.item));
    data.set("tags", options.item.tags);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", options.endpoint);
    xhr.upload.onprogress = (event) => reportProgress(event, options.onProgress);
    xhr.onload = () => settleRelayResponse(xhr, resolve, reject);
    xhr.onerror = () => reject(new Error("服务器中转上传网络错误"));
    xhr.send(data);
  });
}

function settleRelayResponse(
  xhr: XMLHttpRequest,
  resolve: () => void,
  reject: (error: Error) => void,
): void {
  let result: unknown;
  try {
    result = JSON.parse(xhr.responseText);
  } catch (cause) {
    reject(new Error("服务器中转响应不是有效 JSON。", { cause }));
    return;
  }
  if (isSuccessfulStatus(xhr.status) && isRecord(result) && result.ok === true) {
    resolve();
    return;
  }
  reject(new Error(readResultError(result, xhr.status)));
}

async function readJsonRecord(
  response: Response,
  operation: string,
): Promise<Record<string, unknown>> {
  const result: unknown = await response.json();
  if (!isRecord(result)) throw new Error(`${operation}响应格式无效。`);
  return result;
}

function assertSuccessfulResult(
  response: Response,
  result: Record<string, unknown>,
): void {
  if (response.ok && result.ok === true) return;
  throw new Error(readResultError(result, response.status));
}

function readStringRecord(value: unknown, error: string): Record<string, string> {
  if (!isRecord(value)) throw new Error(error);
  const entries = Object.entries(value);
  if (entries.some(([, item]) => typeof item !== "string")) throw new Error(error);
  return Object.fromEntries(entries) as Record<string, string>;
}

function reportProgress(
  event: ProgressEvent,
  onProgress: (progress: number) => void,
): void {
  if (!event.lengthComputable) return;
  onProgress(Math.round((event.loaded / event.total) * PERCENT_MAX));
}

function itemName(item: UploadItem): string {
  return item.name.trim() || baseName(item.file.name);
}

function isSuccessfulStatus(status: number): boolean {
  return status >= HTTP_SUCCESS_MIN && status < HTTP_SUCCESS_MAX;
}

function readResultError(result: unknown, status: number): string {
  return isRecord(result) && typeof result.error === "string"
    ? result.error
    : `HTTP ${status}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}
