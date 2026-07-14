"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback";
import type { Category, CharacterRef } from "@/lib/types";
import { useBatchUpload } from "./use-batch-upload";
import type { UploadMode } from "./types";

export interface UploadFormOptions {
  readonly categories: readonly Category[];
  readonly characters: readonly CharacterRef[];
  readonly endpoint: string;
}

export function useUploadForm(options: UploadFormOptions) {
  const router = useRouter();
  const feedback = useFeedback();
  const upload = useBatchUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [extraCategories, setExtraCategories] = useState<Category[]>([]);
  const [character, setCharacter] = useState(options.characters[0]?.id ?? "");
  const [subCategory, setSubCategory] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("direct");
  const allCategories = useMemo(
    () => mergeCategories(options.categories, extraCategories),
    [extraCategories, options.categories],
  );
  const subCategories = useMemo(
    () => allCategories.filter((category) => category.characterId === character),
    [allCategories, character],
  );
  const fileActions = useFileActions({ feedback, upload });
  const startUpload = useStartUpload({ character, endpoint: options.endpoint, feedback, router,
    subCategory, summary: upload.summary, uploadItems: upload.startUpload, uploadMode });
  const onSubcategoryCreated = useCallback((category: Category) => {
    setExtraCategories((current) => mergeCategories(current, [category]));
    setSubCategory(category.id);
    setCreateOpen(false);
    router.refresh();
  }, [router]);
  return { ...upload, ...fileActions, character, createOpen, dragOver, fileInputRef,
    onSubcategoryCreated, setCharacter, setCreateOpen, setDragOver, setSubCategory,
    setUploadMode, startUpload, subCategories, subCategory, uploadMode };
}

export type UploadFormController = ReturnType<typeof useUploadForm>;

function useFileActions({ feedback, upload }: {
  readonly feedback: ReturnType<typeof useFeedback>;
  readonly upload: ReturnType<typeof useBatchUpload>;
}) {
  const { addDroppedFiles: prepareDroppedFiles, addFiles: prepareFiles } = upload;
  const addFiles = useCallback(async (files: readonly File[]) => {
    try {
      reportProcessingResult(await prepareFiles(files), feedback);
    } catch (error) {
      feedback.error(errorMessage(error, "图片预处理失败。"));
    }
  }, [feedback, prepareFiles]);
  const addDroppedFiles = useCallback(async (dataTransfer: DataTransfer) => {
    try {
      reportProcessingResult(await prepareDroppedFiles(dataTransfer), feedback);
    } catch (error) {
      feedback.error(errorMessage(error, "读取拖拽文件失败。"));
    }
  }, [feedback, prepareDroppedFiles]);
  return { addDroppedFiles, addFiles };
}

function useStartUpload({ character, endpoint, feedback, router, subCategory, summary, uploadItems, uploadMode }: {
  readonly character: string;
  readonly endpoint: string;
  readonly feedback: ReturnType<typeof useFeedback>;
  readonly router: ReturnType<typeof useRouter>;
  readonly subCategory: string;
  readonly summary: { readonly uploadable: number };
  readonly uploadItems: ReturnType<typeof useBatchUpload>["startUpload"];
  readonly uploadMode: UploadMode;
}) {
  return useCallback(async () => {
    const validationError = validateUploadStart({ character, subCategory, uploadable: summary.uploadable });
    if (validationError) {
      feedback.error(validationError);
      return;
    }
    const loadingId = feedback.loading(`正在上传 ${summary.uploadable} 张图片`);
    try {
      await uploadItems({ endpoint, category: subCategory, mode: uploadMode });
      feedback.success("处理完成，可关闭页面或继续上传。");
    } catch (error) {
      feedback.error(errorMessage(error, "批量上传失败。"));
    } finally {
      feedback.dismiss(loadingId);
      router.refresh();
    }
  }, [character, endpoint, feedback, router, subCategory, summary.uploadable, uploadItems, uploadMode]);
}

function validateUploadStart(options: { readonly character: string; readonly subCategory: string; readonly uploadable: number }): string | null {
  if (!options.character) return "请先选择角色。";
  if (!options.subCategory) return "请选择子分类（或新建一个）。";
  return options.uploadable === 0 ? "没有可上传的图片。" : null;
}

function reportProcessingResult(result: { readonly added: number; readonly failed: number }, feedback: ReturnType<typeof useFeedback>) {
  feedback.info(`已添加 ${result.added} 张图片`);
  if (result.failed > 0) feedback.error(`${result.failed} 张图片预处理失败，请查看对应行。`);
}

function mergeCategories(base: readonly Category[], extra: readonly Category[]): Category[] {
  return [...new Map([...base, ...extra].map((category) => [category.id, category])).values()];
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
