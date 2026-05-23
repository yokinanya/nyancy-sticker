"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Modal } from "@/components/ui/heroui-compat";
import { updateSticker } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { AdminStickerRow, StickerStatus } from "@/lib/queries/admin-stickers";
import type { Category } from "@/lib/types";
import { StickerEditWorkspace } from "./sticker-edit-workspace";

interface StickerEditModalProps {
  sticker: AdminStickerRow;
  categories: readonly Category[];
  onClose: () => void;
  onSaved: () => void;
}

export interface StickerEditState {
  character: string;
  error: string | null;
  name: string;
  status: StickerStatus;
  subCategory: string;
  tags: readonly string[];
}

export interface StickerEditActions {
  setCharacter: (value: string) => void;
  setName: (value: string) => void;
  setStatus: (value: StickerStatus) => void;
  setSubCategory: (value: string) => void;
  setTags: (value: readonly string[]) => void;
}

export function StickerEditModal({ sticker, categories, onClose, onSaved }: StickerEditModalProps) {
  const [pending, startTransition] = useTransition();
  const feedback = useFeedback();
  const initialSelection = useMemo(() => getInitialSelection(sticker, categories), [categories, sticker]);
  const [name, setName] = useState(sticker.name);
  const [character, setCharacter] = useState(initialSelection.character);
  const [subCategory, setSubCategory] = useState(initialSelection.subCategory);
  const [tags, setTags] = useState<readonly string[]>(sticker.tags);
  const [status, setStatus] = useState<StickerStatus>(sticker.status);
  const [error, setError] = useState<string | null>(null);

  const state = { character, error, name, status, subCategory, tags };
  const actions = { setCharacter, setName, setStatus, setSubCategory, setTags };
  const save = () => saveSticker({
    feedback,
    onSaved,
    setError,
    startTransition,
    state,
    stickerId: sticker.id,
  });

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
        <Modal.Container>
          <Modal.Dialog
            className={`motion-panel modal-surface flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden ${error ? "motion-shake" : ""}`}
          >
            <Modal.CloseTrigger className="motion-press absolute right-3 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-base leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">×</span>
            </Modal.CloseTrigger>
            <Modal.Header className="border-b border-default-200 px-4 py-2 sm:px-5">
              <Modal.Heading className="text-sm">编辑贴纸</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <StickerEditWorkspace
                actions={actions}
                categories={categories}
                state={state}
                sticker={sticker}
              />
            </Modal.Body>
            <Modal.Footer className="sticker-edit-footer px-4 py-2 sm:px-5">
              <div className="flex w-full flex-wrap justify-end gap-2">
                <Button variant="ghost" onPress={onClose} className="motion-press">
                  取消
                </Button>
                <Button variant="primary" isPending={pending} onPress={save} className="motion-press">
                  保存
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function getInitialSelection(sticker: AdminStickerRow, categories: readonly Category[]) {
  const category = categories.find((item) => item.id === sticker.categoryId);
  return {
    character: category?.parentId ?? sticker.categoryId,
    subCategory: category?.parentId ? sticker.categoryId : "",
  };
}

function saveSticker({
  feedback,
  onSaved,
  setError,
  startTransition,
  state,
  stickerId,
}: {
  feedback: ReturnType<typeof useFeedback>;
  onSaved: () => void;
  setError: (error: string | null) => void;
  startTransition: (callback: () => void) => void;
  state: StickerEditState;
  stickerId: string;
}) {
  setError(null);
  if (!state.subCategory) {
    setError("请选择子分类。");
    return;
  }
  startTransition(async () => {
    try {
      await updateSticker(buildFormData(stickerId, state));
      feedback.success(`已保存：${state.name}`);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败。";
      setError(message);
      feedback.error(message);
    }
  });
}

function buildFormData(stickerId: string, state: StickerEditState) {
  const fd = new FormData();
  fd.set("id", stickerId);
  fd.set("editName", state.name);
  fd.set("editCategory", state.subCategory);
  fd.set("editTags", state.tags.join(","));
  fd.set("editStatus", state.status);
  return fd;
}
