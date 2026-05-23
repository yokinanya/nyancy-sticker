"use client";

import { useState } from "react";
import { Button, Input, Modal, Tag, TagGroup } from "@/components/ui/heroui-compat";
import { CategorySelect } from "@/app/admin/category-select";
import type { Category } from "@/lib/types";

type TagMode = "add-tags" | "remove-tags";

interface Props {
  topLevels: readonly Category[];
  subCategories: readonly Category[];
  character: string;
  category: string;
  isOpen: boolean;
  isPending: boolean;
  selectedCount: number;
  tags: readonly string[];
  tagDraft: string;
  tagMode: TagMode;
  deleteDisabledReason: string | null;
  onAddTag: () => void;
  onChangeCategory: (value: string) => void;
  onChangeCharacter: (value: string) => void;
  onChangeTagMode: (value: TagMode) => void;
  onChangeTagDraft: (value: string) => void;
  onClose: () => void;
  onRemoveTags: (keys: Set<React.Key>) => void;
  onRun: (operation: string) => void;
}

export function StickersBulkModal({
  topLevels,
  subCategories,
  character,
  category,
  isOpen,
  isPending,
  selectedCount,
  tags,
  tagDraft,
  tagMode,
  deleteDisabledReason,
  onAddTag,
  onChangeCategory,
  onChangeCharacter,
  onChangeTagMode,
  onChangeTagDraft,
  onClose,
  onRemoveTags,
  onRun,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = () => {
    setConfirmingDelete(false);
    onClose();
  };
  const confirmDelete = () => {
    setConfirmingDelete(false);
    onRun("delete");
  };

  return (
    <>
      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && close()}>
          <Modal.Container>
            <Modal.Dialog className="motion-panel modal-surface w-full max-w-lg">
              <Modal.Header className="flex items-center justify-between gap-3 border-b border-default-200 px-4 py-3 sm:px-6">
                <Modal.Heading>批量操作</Modal.Heading>
                <Modal.CloseTrigger className="motion-press flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
                  ×
                </Modal.CloseTrigger>
              </Modal.Header>
              <Modal.Body className="grid gap-5 px-4 py-4 sm:px-6">
                <BulkCategorySection
                  category={category}
                  character={character}
                  isPending={isPending}
                  subCategories={subCategories}
                  topLevels={topLevels}
                  onChangeCategory={onChangeCategory}
                  onChangeCharacter={onChangeCharacter}
                  onRun={onRun}
                />
                <BulkTagsSection
                  isPending={isPending}
                  tagDraft={tagDraft}
                  tagMode={tagMode}
                  tags={tags}
                  onAddTag={onAddTag}
                  onChangeTagDraft={onChangeTagDraft}
                  onChangeTagMode={onChangeTagMode}
                  onRemoveTags={onRemoveTags}
                  onRun={onRun}
                />
              </Modal.Body>
              <Modal.Footer>
                <BulkFooterActions
                  deleteDisabledReason={deleteDisabledReason}
                  isPending={isPending}
                  onClose={close}
                  onRequestDelete={() => setConfirmingDelete(true)}
                />
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <BulkDeleteConfirmModal
        isOpen={confirmingDelete}
        isPending={isPending}
        selectedCount={selectedCount}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function BulkFooterActions({
  deleteDisabledReason,
  isPending,
  onClose,
  onRequestDelete,
}: {
  deleteDisabledReason: string | null;
  isPending: boolean;
  onClose: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      {deleteDisabledReason ? <p className="text-xs text-default-500">{deleteDisabledReason}</p> : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onPress={onClose} className="motion-press">
          取消
        </Button>
        <Button
          variant="ghost"
          isPending={isPending}
          isDisabled={Boolean(deleteDisabledReason)}
          onPress={onRequestDelete}
          className="motion-press border border-danger/30 text-danger hover:bg-danger/10"
        >
          删除选中
        </Button>
      </div>
    </div>
  );
}

function BulkDeleteConfirmModal({
  isOpen,
  isPending,
  onCancel,
  onConfirm,
  selectedCount,
}: {
  isOpen: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  selectedCount: number;
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
              <p className="text-sm text-default-600">确认永久删除 {selectedCount} 张已拒绝贴纸？</p>
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

function BulkCategorySection({
  category,
  character,
  isPending,
  onChangeCategory,
  onChangeCharacter,
  onRun,
  subCategories,
  topLevels,
}: {
  category: string;
  character: string;
  isPending: boolean;
  onChangeCategory: (value: string) => void;
  onChangeCharacter: (value: string) => void;
  onRun: (operation: string) => void;
  subCategories: readonly Category[];
  topLevels: readonly Category[];
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-medium">修改分类</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CategorySelect categories={topLevels} value={character} onChange={onChangeCharacter} />
        <CategorySelect categories={subCategories} value={category} onChange={onChangeCategory} />
      </div>
      <Button
        variant="primary"
        isPending={isPending}
        isDisabled={!category}
        onPress={() => onRun("category")}
        className="motion-press justify-self-start"
      >
        保存分类
      </Button>
    </section>
  );
}

function BulkTagsSection({
  isPending,
  onAddTag,
  onChangeTagDraft,
  onChangeTagMode,
  onRemoveTags,
  onRun,
  tagDraft,
  tagMode,
  tags,
}: {
  isPending: boolean;
  onAddTag: () => void;
  onChangeTagDraft: (value: string) => void;
  onChangeTagMode: (value: TagMode) => void;
  onRemoveTags: (keys: Set<React.Key>) => void;
  onRun: (operation: string) => void;
  tagDraft: string;
  tagMode: TagMode;
  tags: readonly string[];
}) {
  return (
    <section className="grid gap-3 border-t border-default-200 pt-4">
      <h3 className="text-sm font-medium">标签操作</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <TagModeSelector onChangeTagMode={onChangeTagMode} tagMode={tagMode} />
        <Input
          value={tagDraft}
          onChange={(event) => onChangeTagDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onAddTag();
          }}
          placeholder="输入标签后回车"
          className="field-control"
        />
        <Button variant="ghost" onPress={onAddTag} className="motion-press">
          加入列表
        </Button>
      </div>
      <BulkTagList tags={tags} onRemoveTags={onRemoveTags} />
      <Button
        variant="primary"
        isPending={isPending}
        isDisabled={tags.length === 0}
        onPress={() => onRun(tagMode)}
        className="motion-press justify-self-start"
      >
        {tagMode === "add-tags" ? "批量添加标签" : "批量移除标签"}
      </Button>
    </section>
  );
}

function TagModeSelector({
  onChangeTagMode,
  tagMode,
}: {
  onChangeTagMode: (value: TagMode) => void;
  tagMode: TagMode;
}) {
  return (
    <div className="flex rounded-lg border border-default-200 p-1">
      <TagModeButton isSelected={tagMode === "add-tags"} onPress={() => onChangeTagMode("add-tags")}>
        添加
      </TagModeButton>
      <TagModeButton isSelected={tagMode === "remove-tags"} onPress={() => onChangeTagMode("remove-tags")}>
        移除
      </TagModeButton>
    </div>
  );
}

function BulkTagList({
  onRemoveTags,
  tags,
}: {
  onRemoveTags: (keys: Set<React.Key>) => void;
  tags: readonly string[];
}) {
  if (tags.length === 0) return <p className="text-xs text-default-400">还没有选择标签。</p>;
  return (
    <TagGroup
      aria-label="批量标签"
      size="sm"
      variant="surface"
      onRemove={(keys) => onRemoveTags(new Set([...keys]))}
    >
      <TagGroup.List items={tags.map((tag) => ({ id: tag }))}>
        {(item) => <Tag id={item.id}>{item.id}</Tag>}
      </TagGroup.List>
    </TagGroup>
  );
}

function TagModeButton({
  children,
  isSelected,
  onPress,
}: {
  children: React.ReactNode;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      size="sm"
      variant={isSelected ? "primary" : "ghost"}
      onPress={onPress}
      className="motion-press h-8 px-3"
    >
      {children}
    </Button>
  );
}
