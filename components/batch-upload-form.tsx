"use client";

import { CreateSubcategoryModal } from "@/app/submit/create-subcategory-modal";
import type { Category, CharacterRef } from "@/lib/types";
import { UploadConfiguration, UploadDropArea } from "./batch-upload/upload-controls";
import { UploadQueuePanel } from "./batch-upload/upload-item-list";
import { useUploadForm } from "./batch-upload/upload-form-controller";
import type { UploadFormController } from "./batch-upload/upload-form-controller";

interface Props {
  readonly categories: readonly Category[];
  readonly characters: readonly CharacterRef[];
  readonly endpoint?: string;
  readonly submitLabel?: string;
  readonly allowCreateSubcategory?: boolean;
}

export function BatchUploadForm({ categories, characters, endpoint = "/api/submit",
  submitLabel = "开始上传", allowCreateSubcategory = true }: Props) {
  const controller = useUploadForm({ categories, characters, endpoint });
  const { addFiles, fileInputRef } = controller;
  const characterName = characters.find((item) => item.id === controller.character)?.name ?? "";
  return (
    <div className="flex flex-col gap-4">
      <UploadConfiguration characters={characters} subCategories={controller.subCategories}
        character={controller.character} subCategory={controller.subCategory}
        uploadMode={controller.uploadMode} canCreateSubcategory={Boolean(controller.character && allowCreateSubcategory)}
        onCharacterChange={(value) => { controller.setCharacter(value); controller.setSubCategory(""); }}
        onSubCategoryChange={controller.setSubCategory} onUploadModeChange={controller.setUploadMode}
        onCreateSubcategory={() => controller.setCreateOpen(true)} />
      <UploadDropArea dragOver={controller.dragOver} setDragOver={controller.setDragOver}
        onDropFiles={controller.addDroppedFiles} onClick={() => controller.fileInputRef.current?.click()}
        hasItems={controller.items.length > 0} />
      <UploadFileInput addFiles={addFiles} fileInputRef={fileInputRef} />
      <UploadQueuePanel items={controller.items} summary={controller.summary} uploading={controller.uploading}
        submitLabel={submitLabel} onClear={controller.clearItems} onStart={() => void controller.startUpload()}
        onPatch={controller.patchItem} onRemove={controller.removeItem} />
      <CreateCategoryDialog controller={controller} characterName={characterName} />
    </div>
  );
}

function UploadFileInput({ addFiles, fileInputRef }: {
  readonly addFiles: UploadFormController["addFiles"];
  readonly fileInputRef: UploadFormController["fileInputRef"];
}) {
  return (
    <input ref={fileInputRef} type="file" multiple
      accept="image/png,image/jpeg,image/gif,image/webp" className="hidden"
      onChange={(event) => {
        void addFiles([...(event.currentTarget.files ?? [])]);
        event.currentTarget.value = "";
      }} />
  );
}

function CreateCategoryDialog({ characterName, controller }: {
  readonly characterName: string;
  readonly controller: UploadFormController;
}) {
  if (!controller.createOpen || !controller.character) return null;
  return <CreateSubcategoryModal characterId={controller.character} parentName={characterName}
    onClose={() => controller.setCreateOpen(false)} onCreated={controller.onSubcategoryCreated} />;
}
