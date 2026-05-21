"use client";

import Image from "next/image";
import { Button, Modal } from "@heroui/react";
import { useState } from "react";
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
  const pushRecent = useFilterStore((s) => s.pushRecent);

  if (!sticker) return null;

  const filename = `${sticker.name || sticker.id}.${sticker.ext}`;

  const flash = (t: Toast, ms = 2000) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), ms);
  };

  const onCopyImage = async () => {
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

  const onDownload = () => {
    setBusy("download");
    downloadFile(sticker.src, filename);
    pushRecent(sticker.id);
    setBusy(null);
    flash({ msg: "已开始下载", tone: "success" });
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="max-w-lg">
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
              <div className="grid w-full grid-cols-3 gap-2">
                <Button isPending={busy === "image"} onPress={onCopyImage}>
                  复制图片
                </Button>
                <Button variant="secondary" isPending={busy === "link"} onPress={onCopyLink}>
                  复制链接
                </Button>
                <Button variant="ghost" isPending={busy === "download"} onPress={onDownload}>
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
