"use client";

import { CheckSquare, Download, Square } from "lucide-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useFeedback } from "@/components/feedback";
import { Button } from "@/components/ui/heroui-compat";
import { downloadStickerZip } from "@/lib/clipboard";
import type { Sticker } from "@/lib/types";

const UNSAFE_FILENAME_PATTERN = /[\\/:*?"<>|]+/g;
const EDGE_SEPARATOR_PATTERN = /^[.\s_-]+|[.\s_-]+$/g;

export type StickerSelection = ReturnType<typeof useStickerSelection>;

export function useStickerSelection(filtered: readonly Sticker[], filenameBase: string) {
  const [isSelectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [isDownloading, setDownloading] = useState(false);
  const feedback = useFeedback();

  const enter = useCallback(() => setSelectionMode(true), []);
  const exit = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);
  const clear = useCallback(() => setSelectedIds(new Set()), []);
  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => toggleId(current, id));
  }, []);
  const selectVisible = useCallback(() => {
    setSelectedIds(new Set(filtered.map((sticker) => sticker.id)));
  }, [filtered]);
  const invertVisible = useCallback(() => {
    setSelectedIds((current) => invertFilteredIds(current, filtered));
  }, [filtered]);
  const download = useCallback(async () => {
    await downloadSelected([...selectedIds], filenameBase, setDownloading, feedback);
  }, [feedback, filenameBase, selectedIds]);

  return {
    clear,
    download,
    enter,
    exit,
    isDownloading,
    isSelectionMode,
    invertVisible,
    selectVisible,
    selectedCount: selectedIds.size,
    selectedIds,
    toggle,
  };
}

export function SelectionModeToggle({ selection }: { selection: StickerSelection }) {
  const label = selection.isSelectionMode ? "退出选择" : "选择";
  return (
    <Button
      variant={selection.isSelectionMode ? "primary" : "soft"}
      size="md"
      onPress={selection.isSelectionMode ? selection.exit : selection.enter}
      className="motion-press h-10"
      aria-pressed={selection.isSelectionMode}
    >
      {selection.isSelectionMode ? (
        <CheckSquare className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Square className="h-4 w-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

export function BatchDownloadBar({ selection }: { selection: StickerSelection }) {
  if (!selection.isSelectionMode) return null;
  return <FloatingToolbar selection={selection} />;
}

function FloatingToolbar({ selection }: { selection: StickerSelection }) {
  if (typeof document === "undefined") return null;
  return createPortal(<ToolbarContent selection={selection} />, document.body);
}

function ToolbarContent({ selection }: { selection: StickerSelection }) {
  return (
    <div className="fixed inset-x-3 bottom-4 z-[80] mx-auto flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-lg border border-border-subtle bg-background/95 p-2 shadow-[0_18px_48px_rgb(15_23_42/0.22)] backdrop-blur sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:flex-nowrap">
      <span className="px-2 text-sm text-default-600">已选 {selection.selectedCount} 个</span>
      <SelectVisibleButton selection={selection} />
      <Button variant="soft" size="sm" onPress={selection.invertVisible} className="motion-press">
        反选
      </Button>
      <Button variant="ghost" size="sm" onPress={selection.clear} className="motion-press">
        清空
      </Button>
      <DownloadSelectedButton selection={selection} />
    </div>
  );
}

function SelectVisibleButton({ selection }: { selection: StickerSelection }) {
  return (
    <Button variant="soft" size="sm" onPress={selection.selectVisible} className="motion-press">
      <CheckSquare className="h-4 w-4" aria-hidden="true" />
      全选当前结果
    </Button>
  );
}

function DownloadSelectedButton({ selection }: { selection: StickerSelection }) {
  return (
    <Button
      variant="primary"
      size="sm"
      isPending={selection.isDownloading}
      isDisabled={selection.selectedCount === 0}
      onPress={selection.download}
      className="motion-press"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      下载所选
    </Button>
  );
}

function toggleId(current: ReadonlySet<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function invertFilteredIds(current: ReadonlySet<string>, filtered: readonly Sticker[]) {
  const next = new Set(current);
  for (const sticker of filtered) {
    if (next.has(sticker.id)) next.delete(sticker.id);
    else next.add(sticker.id);
  }
  return next;
}

async function downloadSelected(
  ids: readonly string[],
  filenameBase: string,
  setDownloading: (value: boolean) => void,
  feedback: ReturnType<typeof useFeedback>,
) {
  if (ids.length === 0) {
    feedback.error("请先选择贴纸");
    return;
  }
  setDownloading(true);
  try {
    await downloadStickerZip(ids, `${safeFilenameBase(filenameBase)}-${ids.length}.zip`);
    feedback.success("已开始下载 ZIP");
  } catch (error) {
    feedback.error((error as Error).message);
  } finally {
    setDownloading(false);
  }
}

function safeFilenameBase(value: string) {
  return value.replace(UNSAFE_FILENAME_PATTERN, "_").replace(EDGE_SEPARATOR_PATTERN, "") || "stickers";
}
