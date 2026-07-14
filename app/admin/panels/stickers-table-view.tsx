"use client";

import { Button } from "@/components/ui/heroui-compat";
import { StickerEditModal } from "./sticker-edit-modal";
import { StickersBulkModal } from "./stickers-bulk-modal";
import type { StickersTableController } from "./stickers-table-controller";
import { StickersDesktopTable } from "./stickers-desktop-table";
import { StickersResponsiveList } from "./stickers-responsive-list";
import { PageSizeSelect } from "./stickers-table-parts";
import type { StickersTableProps } from "./stickers-table-types";

export function StickersTableView(props: StickersTableProps & { readonly controller: StickersTableController }) {
  const { controller } = props;
  return (
    <div className="flex flex-col gap-3">
      <SelectionToolbar controller={controller} />
      <StickersDesktopTable categories={props.categories} characters={props.characters}
        filters={controller.navigation.filters} items={props.items}
        onApplyFilter={controller.navigation.applyFilter} onSort={controller.navigation.setSort}
        onToggleAll={controller.selection.toggleAll} selectedSet={controller.selection.selectedSet} sort={props.sort} />
      <StickersResponsiveList items={props.items} categoryDisplayMap={controller.categoryDisplayMap}
        selectedSet={controller.selection.selectedSet} onEdit={controller.setEditing}
        onToggle={controller.selection.toggleOne} />
      <Pagination {...props} controller={controller} />
      <TableDialogs {...props} controller={controller} />
    </div>
  );
}

function SelectionToolbar({ controller }: { readonly controller: StickersTableController }) {
  const count = controller.selection.selected.length;
  return (
    <div className="admin-toolbar p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" className="motion-press" isDisabled={count === 0}
          onPress={() => controller.bulk.setOpen(true)}>批量操作（{count}）</Button>
        <p className="text-sm text-default-500">已选 {count} 张贴纸</p>
      </div>
    </div>
  );
}

function Pagination(props: StickersTableProps & { readonly controller: StickersTableController }) {
  return (
    <div className="admin-toolbar flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-default-500">
      <span>第 {props.page} / {props.pageCount} 页 · 共 {props.total} 条</span>
      <div className="flex items-center gap-2">
        <PageSizeSelect value={String(props.pageSize)} onChange={props.controller.navigation.setPageSize} />
        <Button size="sm" variant="ghost" isDisabled={props.page <= 1}
          onPress={() => props.controller.navigation.goPage(props.page - 1)} className="motion-press">上一页</Button>
        <Button size="sm" variant="ghost" isDisabled={props.page >= props.pageCount}
          onPress={() => props.controller.navigation.goPage(props.page + 1)} className="motion-press">下一页</Button>
      </div>
    </div>
  );
}

function TableDialogs(props: StickersTableProps & { readonly controller: StickersTableController }) {
  const { bulk, editing, selection } = props.controller;
  return (
    <>
      {editing ? <StickerEditModal sticker={editing} categories={props.categories} characters={props.characters}
        onClose={() => props.controller.setEditing(null)} onSaved={props.controller.onEditSaved} /> : null}
      <StickersBulkModal topLevels={props.characters} subCategories={bulk.subCategories}
        character={bulk.character} category={bulk.category} isOpen={bulk.isOpen}
        isPending={bulk.isPending} selectedCount={selection.selected.length} tags={bulk.tags}
        tagDraft={bulk.tagDraft} tagMode={bulk.tagMode} onAddTag={bulk.addTag}
        onChangeCategory={bulk.setCategory} onChangeCharacter={bulk.changeCharacter}
        onChangeTagMode={bulk.setTagMode} onChangeTagDraft={bulk.setTagDraft}
        onClose={() => bulk.setOpen(false)} deleteDisabledReason={selection.deleteDisabledReason}
        onRemoveTags={bulk.removeTags} onRun={bulk.run} />
    </>
  );
}
