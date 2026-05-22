"use client";

import Image from "next/image";
import { Button, Modal } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { copyImage, copyText, downloadFile } from "@/lib/clipboard";
import { useFilterStore } from "@/lib/store";
import type { Sticker } from "@/lib/types";

interface Props {
  sticker: Sticker | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type Toast = { msg: string; tone: "success" | "error" } | null;

export function StickerPreviewModal({ sticker, isOpen, onOpenChange }: Props) {
  const [busy, setBusy] = useState<"image" | "link" | "download" | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | null>(null);
  const pushRecent = useFilterStore((s) => s.pushRecent);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  if (!sticker) return null;

  const filename = `${sticker.name || sticker.id}.${sticker.ext}`;
  const isGif = sticker.ext === "gif";

  const flash = (t: Toast, ms = 2000) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(t);
    if (t) toastTimer.current = window.setTimeout(() => setToast(null), ms);
  };

  const onCopyImage = async () => {
    if (busy) return;
    setBusy("image");
    const r = await copyImage(sticker.src);
    setBusy(null);
    if (r.ok) {
      pushRecent(sticker.id);
      flash({ msg: "图片已复制，去粘贴吧～", tone: "success" });
    } else {
      const map = {
        unsupported: "当前浏览器不支持复制图片，请改用「复制链接」或「下载」",
        "fetch-failed": "图片下载失败，请检查网络",
        denied: "复制被拒绝，请确认浏览器权限",
        "decode-failed": "图片解码失败（GIF 仅会复制首帧，建议直接下载）",
      } as const;
      flash({ msg: map[r.reason], tone: "error" }, 3500);
    }
  };

  const onCopyLink = async () => {
    if (busy) return;
    setBusy("link");
    const ok = await copyText(sticker.src);
    setBusy(null);
    pushRecent(sticker.id);
    flash(
      ok
        ? { msg: "链接已复制", tone: "success" }
        : { msg: "复制失败，请手动复制", tone: "error" },
    );
  };

  const onDownload = async () => {
    if (busy) return;
    setBusy("download");
    try {
      await downloadFile(sticker.src, filename);
      pushRecent(sticker.id);
      flash({ msg: "已开始下载", tone: "success" });
    } catch {
      flash({ msg: "下载失败，已尝试新标签页打开", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface w-full max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{sticker.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col items-center gap-4">
                <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
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
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 dark:bg-zinc-700">
                    {sticker.category}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    ID: {sticker.id}
                  </span>
                  {sticker.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
                {toast && (
                  <div
                    role="status"
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      toast.tone === "success"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                    }`}
                  >
                    {toast.msg}
                  </div>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div className="flex w-full flex-col justify-center gap-2 sm:flex-row sm:gap-3">
                {!isGif ? (
                  <Button
                    isDisabled={busy !== null && busy !== "image"}
                    isPending={busy === "image"}
                  onPress={onCopyImage}
                    className="motion-interactive"
                  >
                    复制图片
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  isDisabled={busy !== null && busy !== "link"}
                  isPending={busy === "link"}
                  onPress={onCopyLink}
                  className="motion-interactive"
                >
                  复制链接
                </Button>
                <Button
                  variant="ghost"
                  isDisabled={busy !== null && busy !== "download"}
                  isPending={busy === "download"}
                  onPress={onDownload}
                  className="motion-interactive"
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
