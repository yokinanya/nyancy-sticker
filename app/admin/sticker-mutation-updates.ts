import "server-only";

import {
  updateAdminStickerData,
  updatePendingStickerData,
  updatePublishedStickerData,
} from "@/lib/action-cache-updates";
import type { StickerMutationRow } from "./sticker-mutation-data";

interface SingleStickerUpdate {
  readonly before: StickerMutationRow;
  readonly nextStatus: StickerMutationRow["status"];
  readonly nextCharacterId: string;
}

export function updateBulkStickerData(
  rows: readonly StickerMutationRow[],
  targetCharacterId?: string,
): void {
  const approved = rows.filter((row) => row.status === "approved");
  if (approved.length > 0) {
    const oldIds = approved.map((row) => row.characterId);
    const characterIds = targetCharacterId
      ? [...oldIds, targetCharacterId]
      : oldIds;
    const countsChanged = Boolean(
      targetCharacterId &&
        approved.some((row) => row.characterId !== targetCharacterId),
    );
    updatePublishedStickerData({ characterIds, countsChanged });
    return;
  }
  if (rows.some((row) => row.status === "pending")) {
    updatePendingStickerData();
    return;
  }
  updateAdminStickerData();
}

export function updateSingleStickerData(update: SingleStickerUpdate): void {
  const wasApproved = update.before.status === "approved";
  const isApproved = update.nextStatus === "approved";
  if (wasApproved || isApproved) {
    const characterIds = [
      wasApproved ? update.before.characterId : "",
      isApproved ? update.nextCharacterId : "",
    ];
    const moved = update.before.characterId !== update.nextCharacterId;
    updatePublishedStickerData({
      characterIds,
      countsChanged: wasApproved !== isApproved || (wasApproved && moved),
    });
    return;
  }
  if (update.before.status === "pending" || update.nextStatus === "pending") {
    updatePendingStickerData();
    return;
  }
  updateAdminStickerData();
}
