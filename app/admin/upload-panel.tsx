"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { CategorySelect } from "./category-select";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const DIRECTORY_INPUT_PROPS = {
  directory: "",
  webkitdirectory: "",
};

interface Props {
  categories: readonly Category[];
  pending: boolean;
  onRun: (action: () => Promise<void>, done: string) => void;
}

interface DirectoryEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FileEntry extends DirectoryEntry {
  file: (success: (file: File) => void, error: (error: DOMException) => void) => void;
}

interface FolderEntry extends DirectoryEntry {
  createReader: () => {
    readEntries: (
      success: (entries: DirectoryEntry[]) => void,
      error: (error: DOMException) => void,
    ) => void;
  };
}

interface DirectoryItem {
  webkitGetAsEntry?: () => DirectoryEntry | null;
}

export function UploadPanel({ categories, pending, onRun }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState(categories[0]?.id ?? "");
  const [tags, setTags] = useState("");
  const [picked, setPicked] = useState<readonly File[]>([]);
  const [message, setMessage] = useState("可选择文件、选择目录，或把目录拖到这里。");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const submit = async (files: readonly File[]) => {
    if (files.length === 0) {
      setMessage("没有找到可上传的图片文件。");
      return;
    }
    const form = buildUploadForm(files, category, tags);
    setUploading(true);
    setProgress(0);
    setMessage("正在上传到本地服务...");
    try {
      await uploadBatch(form, setProgress);
      setMessage(`上传完成：${files.length} 个文件。`);
      setPicked([]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败。");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void collectDroppedFiles(event.dataTransfer).then((files) => {
          setPicked(files);
          setMessage(`已读取 ${files.length} 个图片文件。`);
        }, (error: unknown) => {
          setMessage(error instanceof Error ? error.message : "读取拖拽目录失败。");
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/gif,image/webp"
          {...DIRECTORY_INPUT_PROPS}
          onChange={(event) => {
            const files = filterImages([...event.currentTarget.files ?? []]);
            setPicked(files);
            setMessage(`已选择 ${files.length} 个图片文件。`);
          }}
        />
        <CategorySelect categories={categories} value={category} onChange={setCategory} />
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="标签，逗号分隔"
          className="admin-input"
        />
        <button
          className="admin-button"
          disabled={pending || uploading}
          type="button"
          onClick={() => void submit(picked)}
        >
          {uploading ? "上传中" : "批量上传"}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        R2 目录：{uploadDirectoryPreview(categories, category)}
      </p>
      {uploading ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-950 transition-all dark:bg-zinc-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      <p className="mt-2 text-xs text-zinc-500">{message}</p>
    </section>
  );
}

function uploadDirectoryPreview(categories: readonly Category[], categoryId: string) {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) return "未选择分类";
  if (category.parentId) return `stickers/${category.parentId}/${category.id}/`;
  return `stickers/${category.id}/`;
}

async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<readonly File[]> {
  const entries = [...dataTransfer.items]
    .map((item) => (item as DirectoryItem).webkitGetAsEntry?.())
    .filter((entry): entry is DirectoryEntry => entry !== null && entry !== undefined);
  if (entries.length === 0) return filterImages([...dataTransfer.files]);
  const files = await Promise.all(entries.map(readEntryFiles));
  return filterImages(files.flat());
}

async function readEntryFiles(entry: DirectoryEntry): Promise<readonly File[]> {
  if (entry.isFile) return [await readFileEntry(entry as FileEntry)];
  if (!entry.isDirectory) return [];
  const entries = await readDirectoryEntries(entry as FolderEntry);
  const files = await Promise.all(entries.map(readEntryFiles));
  return files.flat();
}

function readFileEntry(entry: FileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readDirectoryEntries(entry: FolderEntry): Promise<readonly DirectoryEntry[]> {
  const reader = entry.createReader();
  const entries: DirectoryEntry[] = [];
  return new Promise((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(entries);
          return;
        }
        entries.push(...batch);
        readBatch();
      }, reject);
    };
    readBatch();
  });
}

function filterImages(files: readonly File[]): readonly File[] {
  return files.filter((file) => IMAGE_TYPES.has(file.type));
}

function buildUploadForm(files: readonly File[], category: string, tags: string) {
  const formData = new FormData();
  formData.set("uploadCategory", category);
  formData.set("uploadTags", tags);
  files.forEach((file) => formData.append("files", file, file.name));
  return formData;
}

function uploadBatch(formData: FormData, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/admin/upload");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const result = parseUploadResponse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300 && result.ok) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(result.error ?? `上传失败：HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("上传请求失败。"));
    xhr.send(formData);
  });
}

function parseUploadResponse(value: string): { ok: boolean; error?: string } {
  try {
    return JSON.parse(value) as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: "上传响应不是有效 JSON。" };
  }
}
