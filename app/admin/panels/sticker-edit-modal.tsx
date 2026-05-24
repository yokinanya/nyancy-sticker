"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Modal } from "@/components/ui/heroui-compat";
import { bulkUpdateStickers, updateSticker } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { AdminStickerRow, StickerStatus } from "@/lib/queries/admin-stickers";
import type { Category, Character } from "@/lib/types";
import { StickerEditWorkspace } from "./sticker-edit-workspace";

interface StickerEditModalProps {
  sticker: AdminStickerRow;
  categories: readonly Category[];
  characters: readonly Character[];
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

export function StickerEditModal({ sticker, categories, characters, onClose, onSaved }: StickerEditModalProps) {
  const [pending, startTransition] = useTransition();
  const feedback = useFeedback();
  const initialSelection = useMemo(() => getInitialSelection(sticker, categories), [categories, sticker]);
  const [name, setName] = useState(sticker.name);
  const [character, setCharacter] = useState(initialSelection.character);
  const [subCategory, setSubCategory] = useState(initialSelection.subCategory);
  const [tags, setTags] = useState<readonly string[]>(sticker.tags);
  const [status, setStatus] = useState<StickerStatus>(sticker.status);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
  const remove = () => deleteSticker({
    feedback,
    onCancelConfirm: () => setConfirmingDelete(false),
    onDeleted: onSaved,
    setError,
    startTransition,
    sticker,
  });

  return (
    <>
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
                  characters={characters}
                  state={state}
                  sticker={sticker}
                />
              </Modal.Body>
              <Modal.Footer className="sticker-edit-footer px-4 py-2 sm:px-5">
                <StickerEditFooter
                  isPending={pending}
                  sticker={sticker}
                  onCancel={onClose}
                  onRequestDelete={() => setConfirmingDelete(true)}
                  onSave={save}
                />
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <SingleDeleteConfirmModal
        isOpen={confirmingDelete}
        isPending={pending}
        sticker={sticker}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}

function getInitialSelection(sticker: AdminStickerRow, categories: readonly Category[]) {
  const category = categories.find((item) => item.id === sticker.categoryId);
  return {
    character: category?.characterId ?? "",
    subCategory: category ? sticker.categoryId : "",
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

function StickerEditFooter({
  isPending,
  onCancel,
  onRequestDelete,
  onSave,
  sticker,
}: {
  isPending: boolean;
  onCancel: () => void;
  onRequestDelete: () => void;
  onSave: () => void;
  sticker: AdminStickerRow;
}) {
  return (
    <div className="flex w-full flex-wrap justify-between gap-2">
      <div>
        {sticker.status === "rejected" ? (
          <Button
            variant="ghost"
            isPending={isPending}
            onPress={onRequestDelete}
            className="motion-press border border-danger/30 text-danger hover:bg-danger/10"
          >
            删除贴纸
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onPress={onCancel} className="motion-press">
          取消
        </Button>
        <Button variant="primary" isPending={isPending} onPress={onSave} className="motion-press">
          保存
        </Button>
      </div>
    </div>
  );
}

function SingleDeleteConfirmModal({
  isOpen,
  isPending,
  onCancel,
  onConfirm,
  sticker,
}: {
  isOpen: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  sticker: AdminStickerRow;
}) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onCancel()}>
        <Modal.Container>
          <Modal.Dialog className="motion-panel modal-surface w-full max-w-sm">
            <Modal.Header>
              <Modal.Heading>确认删除</Modal.Heading>
              <Modal.Description>这会同时删除原图和预览图对象。</Modal.Description>
            </Modal.Header>
            <Modal.Body>
              <p className="break-words text-sm text-default-600">{sticker.name}</p>
              <p className="mt-1 break-all font-mono text-xs text-default-400">{sticker.id}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" isDisabled={isPending} onPress={onCancel} className="motion-press">
                取消
              </Button>
              <Button
                variant="ghost"
                isPending={isPending}
                onPress={onConfirm}
                className="motion-press border border-danger/40 bg-danger/10 text-danger hover:bg-danger/15"
              >
                删除
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function deleteSticker({
  onCancelConfirm,
  feedback,
  onDeleted,
  setError,
  startTransition,
  sticker,
}: {
  onCancelConfirm: () => void;
  feedback: ReturnType<typeof useFeedback>;
  onDeleted: () => void;
  setError: (error: string | null) => void;
  startTransition: (callback: () => void) => void;
  sticker: AdminStickerRow;
}) {
  setError(null);
  startTransition(async () => {
    try {
      await bulkUpdateStickers(deleteFormData(sticker.id));
      feedback.success(`已删除：${sticker.name}`);
      onDeleted();
    } catch (error) {
      onCancelConfirm();
      const message = error instanceof Error ? error.message : "删除失败。";
      setError(message);
      feedback.error(message);
    }
  });
}

function deleteFormData(stickerId: string) {
  const formData = new FormData();
  formData.set("operation", "delete");
  formData.append("ids", stickerId);
  return formData;
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
