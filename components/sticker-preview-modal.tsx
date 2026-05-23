"use client";

import Image from "next/image";
import { Button, Modal } from "@/components/ui/heroui-compat";
import { useState } from "react";
import { copyImage, copyText, downloadFile } from "@/lib/clipboard";
import { useFeedback } from "@/components/feedback";
import { useFilterStore } from "@/lib/store";
import type { Sticker } from "@/lib/types";

interface Props {
  sticker: Sticker | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StickerPreviewModal({ sticker, isOpen, onOpenChange }: Props) {
  const [busy, setBusy] = useState<"image" | "link" | "download" | null>(null);
  const feedback = useFeedback();
  const pushRecent = useFilterStore((s) => s.pushRecent);

  if (!sticker) return null;

  const filename = `${sticker.name || sticker.id}.${sticker.ext}`;
  const isGif = sticker.ext === "gif";

  const onCopyImage = async () => {
    if (busy) return;
    setBusy("image");
    const r = await copyImage(sticker.src);
    setBusy(null);
    if (r.ok) {
      pushRecent(sticker.id);
      feedback.success("图片已复制，去粘贴吧～");
    } else {
      const map = {
        unsupported: "当前浏览器不支持复制图片，请改用「复制链接」或「下载」",
        "fetch-failed": "图片下载失败，请检查网络",
        denied: "复制被拒绝，请确认浏览器权限",
        "decode-failed": "图片解码失败（GIF 仅会复制首帧，建议直接下载）",
      } as const;
      feedback.error(map[r.reason]);
    }
  };

  const onCopyLink = async () => {
    if (busy) return;
    setBusy("link");
    const ok = await copyText(sticker.src);
    setBusy(null);
    pushRecent(sticker.id);
    if (ok) feedback.success("链接已复制");
    else feedback.error("复制失败，请手动复制");
  };

  const onDownload = async () => {
    if (busy) return;
    setBusy("download");
    try {
      await downloadFile(sticker.src, filename);
      pushRecent(sticker.id);
      feedback.success("已开始下载");
    } catch {
      feedback.error("下载失败，已尝试新标签页打开");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface w-full max-w-lg">
            <Modal.CloseTrigger className="motion-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">
                ×
              </span>
            </Modal.CloseTrigger>
            <Modal.Header>
              <Modal.Heading>{sticker.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col items-center gap-4">
                <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-surface-muted">
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
                <div className="flex flex-wrap justify-center gap-1.5 text-xs">
                  <span className="rounded-full border border-border-subtle bg-surface-raised px-2 py-0.5">
                    {sticker.category}
                  </span>
                  <span className="rounded-full border border-border-subtle bg-surface-muted px-2 py-0.5 font-mono text-muted">
                    ID: {sticker.id}
                  </span>
                  {sticker.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border-subtle bg-surface-muted px-2 py-0.5 text-muted"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
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
                <Button
                  variant="ghost"
                  isDisabled={busy !== null && busy !== "download"}
                  isPending={busy === "download"}
                  onPress={onDownload}
                  className="motion-press"
                >
                  下载
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
