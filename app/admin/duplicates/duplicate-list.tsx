"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Modal } from "@/components/ui/heroui-compat";
import { useFeedback } from "@/components/feedback";
import { markVariantStickers, rejectDuplicateStickers } from "./actions";

interface DuplicateSticker {
  id: string;
  name: string;
  src: string;
  previewSrc: string;
  width: number;
  height: number;
  categoryId: string;
  tags: string[];
  status: "approved" | "pending";
  submitterLogin: string | null;
  submittedAt: Date;
  nearestDistance: number;
}

interface DuplicateGroup {
  id: string;
  minDistance: number;
  stickers: readonly DuplicateSticker[];
}

export function DuplicateReviewList({ groups }: { groups: readonly DuplicateGroup[] }) {
  const [keepByGroup, setKeepByGroup] = useState(() => initialKeepMap(groups));
  const [previewing, setPreviewing] = useState<DuplicateSticker | null>(null);
  return (
    <>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <DuplicateGroupCard
            key={group.id}
            group={group}
            keepIds={keepByGroup[group.id] ?? initialKeepIds(group)}
            onKeep={(id) =>
              setKeepByGroup((current) => ({
                ...current,
                [group.id]: toggleKeepId(current[group.id] ?? initialKeepIds(group), id),
              }))
            }
            onPreview={setPreviewing}
          />
        ))}
      </div>
      <DuplicatePreviewModal sticker={previewing} onClose={() => setPreviewing(null)} />
    </>
  );
}

function DuplicateGroupCard({ group, keepIds, onKeep, onPreview }: DuplicateGroupCardProps) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const keepSet = new Set(keepIds);
  const rejectIds = group.stickers.map((sticker) => sticker.id).filter((id) => !keepSet.has(id));
  const stickerIds = group.stickers.map((sticker) => sticker.id);
  const reject = () => {
    startTransition(() => {
      void rejectDuplicateStickers({ keepIds, rejectIds })
        .then(() => {
          feedback.success("已标记重复项。");
          router.refresh();
        })
        .catch((error: unknown) => feedback.error(errorMessage(error)));
    });
  };
  const markVariants = () => {
    startTransition(() => {
      void markVariantStickers({ stickerIds })
        .then(() => {
          feedback.success("已整组保留。");
          router.refresh();
        })
        .catch((error: unknown) => feedback.error(errorMessage(error)));
    });
  };

  return (
    <article className="admin-panel p-4">
      <DuplicateGroupHeader
        group={group}
        pending={pending}
        rejectCount={rejectIds.length}
        onMarkVariants={markVariants}
        onReject={reject}
      />
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {group.stickers.map((sticker) => (
          <DuplicateStickerCard
            key={sticker.id}
            sticker={sticker}
            isKeep={keepSet.has(sticker.id)}
            onKeep={() => onKeep(sticker.id)}
            onPreview={() => onPreview(sticker)}
          />
        ))}
      </div>
    </article>
  );
}

function DuplicateGroupHeader({
  group,
  pending,
  rejectCount,
  onMarkVariants,
  onReject,
}: DuplicateGroupHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">疑似重复组</p>
        <p className="text-xs text-default-500">
          {group.stickers.length} 张，最小距离 {group.minDistance}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="sm" variant="soft" isPending={pending} onPress={onMarkVariants}>
          整组保留
        </Button>
        <Button size="sm" variant="primary" isPending={pending} isDisabled={rejectCount === 0} onPress={onReject}>
          拒绝其他 {rejectCount} 张
        </Button>
      </div>
    </div>
  );
}

function DuplicateStickerCard({ sticker, isKeep, onKeep, onPreview }: DuplicateStickerCardProps) {
  const border = isKeep ? "border-primary bg-primary/5" : "border-default-200 bg-content1";
  return (
    <div className={`grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-lg border p-3 ${border}`}>
      <div className="relative h-20 w-20">
        <Image src={sticker.previewSrc} alt={sticker.name} width={80} height={80} className="h-20 w-20 object-contain" unoptimized />
        <Button
          size="sm"
          variant="soft"
          isIconOnly
          aria-label="查看大图"
          title="查看大图"
          onPress={onPreview}
          className="absolute bottom-1 right-1 h-7 w-7 border-default-200 bg-content1/90"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{sticker.name}</p>
        <p className="truncate text-xs text-default-500">{sticker.id}</p>
        <p className="truncate text-xs text-default-500">{sticker.categoryId}</p>
        <p className="truncate text-xs text-default-500">
          提交用户：{sticker.submitterLogin ? `@${sticker.submitterLogin}` : "无记录"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Chip size="sm" variant={sticker.status === "approved" ? "primary" : "secondary"}>
            <Chip.Label>{sticker.status === "approved" ? "已发布" : "待审核"}</Chip.Label>
          </Chip>
          <Chip size="sm" variant="soft"><Chip.Label>距离 {sticker.nearestDistance}</Chip.Label></Chip>
        </div>
        <Button size="sm" variant={isKeep ? "soft" : "ghost"} onPress={onKeep} className="mt-3">
          保留
        </Button>
      </div>
    </div>
  );
}

function DuplicatePreviewModal({ sticker, onClose }: { sticker: DuplicateSticker | null; onClose: () => void }) {
  if (!sticker) return null;
  return (
    <Modal>
      <Modal.Backdrop isOpen={Boolean(sticker)} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface w-full max-w-3xl">
            <Modal.CloseTrigger className="motion-press absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">×</span>
            </Modal.CloseTrigger>
            <Modal.Header>
              <Modal.Heading>{sticker.name}</Modal.Heading>
              <Modal.Description>{sticker.id}</Modal.Description>
            </Modal.Header>
            <Modal.Body>
              <div className="relative mx-auto aspect-square w-full max-w-2xl overflow-hidden rounded-lg bg-surface-muted">
                <Image
                  src={sticker.src}
                  alt={sticker.name}
                  fill
                  sizes="min(100vw, 672px)"
                  className="object-contain p-3"
                  unoptimized
                  priority
                />
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function initialKeepMap(groups: readonly DuplicateGroup[]): Record<string, string[]> {
  return Object.fromEntries(groups.map((group) => [group.id, initialKeepIds(group)]));
}

function initialKeepIds(group: DuplicateGroup): string[] {
  return group.stickers[0] ? [group.stickers[0].id] : [];
}

function toggleKeepId(keepIds: readonly string[], id: string): string[] {
  if (!keepIds.includes(id)) return [...keepIds, id];
  if (keepIds.length === 1) return [...keepIds];
  return keepIds.filter((keepId) => keepId !== id);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "处理重复项失败。";
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  keepIds: readonly string[];
  onKeep: (id: string) => void;
  onPreview: (sticker: DuplicateSticker) => void;
}

interface DuplicateGroupHeaderProps {
  group: DuplicateGroup;
  pending: boolean;
  rejectCount: number;
  onMarkVariants: () => void;
  onReject: () => void;
}

interface DuplicateStickerCardProps {
  sticker: DuplicateSticker;
  isKeep: boolean;
  onKeep: () => void;
  onPreview: () => void;
}
