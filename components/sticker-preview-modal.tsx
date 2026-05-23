"use client";

import Image from "next/image";
import { Button, Modal } from "@/components/ui/heroui-compat";
import { useState } from "react";
import { copyImage, copyText, downloadFile } from "@/lib/clipboard";
import { useFeedback } from "@/components/feedback";
import { useFilterStore } from "@/lib/store";
import type { Sticker } from "@/lib/types";

type BusyAction = "image" | "link" | "download";

interface Props {
  sticker: Sticker | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const COPY_IMAGE_ERROR_MESSAGES = {
  unsupported: "当前浏览器不支持复制图片，请改用「复制链接」或「下载」",
  "fetch-failed": "图片下载失败，请检查网络",
  denied: "复制被拒绝，请确认浏览器权限",
  "decode-failed": "图片解码失败（GIF 仅会复制首帧，建议直接下载）",
} as const;

export function StickerPreviewModal({ sticker, isOpen, onOpenChange }: Props) {
  const actions = useStickerActions(sticker);

  if (!sticker) return null;

  const isGif = sticker.ext === "gif";

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface sticker-modal-surface w-full max-w-lg">
            <Modal.CloseTrigger className="motion-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">
                ×
              </span>
            </Modal.CloseTrigger>
            <Modal.Header>
              <Modal.Heading>{sticker.name}</Modal.Heading>
              <Modal.Description className="sr-only">
                预览贴纸图片，并提供分类、ID、尺寸、标签、复制和下载操作。
              </Modal.Description>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col items-center gap-4">
                <StickerImage sticker={sticker} />
                <StickerMetadata sticker={sticker} />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <StickerActions actions={actions} isGif={isGif} />
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function useStickerActions(sticker: Sticker | null) {
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const feedback = useFeedback();
  const pushRecent = useFilterStore((s) => s.pushRecent);

  const requireSticker = () => {
    if (!sticker) throw new Error("Sticker actions require an active sticker.");
    return sticker;
  };

  const onCopyImage = async () => {
    if (busy) return;
    const target = requireSticker();
    setBusy("image");
    const result = await copyImage(target.src);
    setBusy(null);
    if (!result.ok) {
      feedback.error(COPY_IMAGE_ERROR_MESSAGES[result.reason]);
      return;
    }
    pushRecent(target.id);
    feedback.success("图片已复制，去粘贴吧～");
  };

  const onCopyLink = async () => {
    if (busy) return;
    const target = requireSticker();
    setBusy("link");
    const ok = await copyText(target.src);
    setBusy(null);
    pushRecent(target.id);
    if (ok) feedback.success("链接已复制");
    else feedback.error("复制失败，请手动复制");
  };

  const onDownload = async () => {
    if (busy) return;
    const target = requireSticker();
    setBusy("download");
    try {
      await downloadFile(target.src, filenameForSticker(target));
      pushRecent(target.id);
      feedback.success("已开始下载");
    } catch {
      feedback.error("下载失败，已尝试新标签页打开");
    } finally {
      setBusy(null);
    }
  };

  return { busy, onCopyImage, onCopyLink, onDownload };
}

function StickerImage({ sticker }: { sticker: Sticker }) {
  return (
    <div className="relative aspect-square w-full max-w-sm">
      <Image
        src={sticker.src}
        alt={sticker.name}
        fill
        sizes="384px"
        className="object-contain p-3"
        unoptimized={sticker.ext === "gif"}
        priority
      />
    </div>
  );
}

function StickerMetadata({ sticker }: { sticker: Sticker }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 text-xs">
      <MetadataChip>{sticker.category}</MetadataChip>
      <MetadataChip className="font-mono text-muted">ID: {sticker.id}</MetadataChip>
      <MetadataChip className="font-mono text-muted">
        {formatDimensions(sticker.width, sticker.height)}
      </MetadataChip>
      {sticker.tags.map((tag) => (
        <MetadataChip key={tag} className="text-muted">
          #{tag}
        </MetadataChip>
      ))}
    </div>
  );
}

function MetadataChip({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  const baseClassName = "rounded-full border border-border-subtle bg-surface-muted px-2 py-0.5";
  return <span className={[baseClassName, className].filter(Boolean).join(" ")} {...props} />;
}

function StickerActions({
  actions,
  isGif,
}: {
  actions: ReturnType<typeof useStickerActions>;
  isGif: boolean;
}) {
  const { busy, onCopyImage, onCopyLink, onDownload } = actions;
  return (
    <div className="flex w-full flex-col justify-center gap-2 sm:flex-row sm:gap-3">
      {!isGif ? (
        <Button
          isDisabled={busy !== null && busy !== "image"}
          isPending={busy === "image"}
          onPress={onCopyImage}
          className="motion-press"
        >
          复制图片
        </Button>
      ) : null}
      <Button
        variant="secondary"
        isDisabled={busy !== null && busy !== "link"}
        isPending={busy === "link"}
        onPress={onCopyLink}
        className="motion-press"
      >
        复制链接
      </Button>
      <DownloadButton busy={busy} onDownload={onDownload} />
    </div>
  );
}

function DownloadButton({
  busy,
  onDownload,
}: {
  busy: BusyAction | null;
  onDownload: () => Promise<void>;
}) {
  return (
    <Button
      variant="ghost"
      isDisabled={busy !== null && busy !== "download"}
      isPending={busy === "download"}
      onPress={onDownload}
      className="motion-press border-white/80 bg-white/95 text-default-800 shadow-[0_8px_22px_rgb(15_23_42/0.12),inset_0_1px_0_rgb(255_255_255/0.9)] hover:border-white hover:bg-white hover:text-foreground dark:border-white/20 dark:bg-white/90 dark:text-zinc-900 dark:hover:bg-white"
    >
      下载
    </Button>
  );
}

function filenameForSticker(sticker: Sticker) {
  return `${sticker.name || sticker.id}.${sticker.ext}`;
}

function formatDimensions(width: number, height: number) {
  return `${width}×${height}`;
}
