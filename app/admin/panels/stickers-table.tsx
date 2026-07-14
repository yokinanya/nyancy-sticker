"use client";

import { useStickersTable } from "./stickers-table-controller";
import type { StickersTableProps } from "./stickers-table-types";
import { StickersTableView } from "./stickers-table-view";

export function StickersTable(props: StickersTableProps) {
  const controller = useStickersTable(props);
  return <StickersTableView {...props} controller={controller} />;
}
