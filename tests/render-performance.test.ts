import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StickersResponsiveList } from "../app/admin/panels/stickers-responsive-list";
import { ListBox, Select } from "../components/ui/heroui-compat";
import type { AdminStickerRow } from "../lib/queries/admin-stickers";

const STICKER_COUNT = 20;

test("closed Choice omits popover options from the DOM", () => {
  const html = renderToStaticMarkup(
    createElement(Select, { selectedKey: "one" },
      createElement(Select.Trigger, null, createElement(Select.Value, null, "已选择")),
      createElement(Select.Popover, null,
        createElement(ListBox, null,
          createElement(ListBox.Item, { id: "one" }, "关闭时不可见的选项"),
        ),
      ),
    ),
  );
  assert.doesNotMatch(html, /关闭时不可见的选项/);
  assert.doesNotMatch(html, /data-choice-popover/);
});

test("responsive admin sticker list renders one preview per item", () => {
  const items = Array.from({ length: STICKER_COUNT }, (_, index) => stickerRow(index));
  const html = renderToStaticMarkup(
    createElement(StickersResponsiveList, {
      items,
      categoryDisplayMap: new Map([["miya:default", "默认"]]),
      selectedSet: new Set<string>(),
      onEdit: () => undefined,
      onToggle: () => undefined,
    }),
  );
  assert.equal(html.match(/<img\b/g)?.length ?? 0, STICKER_COUNT);
});

function stickerRow(index: number): AdminStickerRow {
  return {
    id: `sticker-${index}`,
    name: `贴纸 ${index}`,
    previewSrc: `https://s3.yokina.moe/sticker-${index}.webp`,
    width: 240,
    height: 240,
    ext: "webp",
    categoryId: "miya:default",
    tags: [],
    status: "approved",
    submitterLogin: null,
    submitterName: null,
    submittedAt: "2026-01-01T00:00:00.000Z",
  };
}
