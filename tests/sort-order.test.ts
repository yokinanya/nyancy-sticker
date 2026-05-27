import assert from "node:assert/strict";
import test from "node:test";
import {
  compareSortOrderThenId,
  compareSortOrderThenSlug,
  nextSortOrder,
} from "../lib/sort-order";
import { parseRequiredInteger } from "../lib/form-values";

test("compareSortOrderThenId falls back to id", () => {
  const items = [
    { id: "zeta", sortOrder: 0 },
    { id: "alpha", sortOrder: 0 },
    { id: "middle", sortOrder: -10 },
  ].toSorted(compareSortOrderThenId);

  assert.deepEqual(items.map((item) => item.id), ["middle", "alpha", "zeta"]);
});

test("compareSortOrderThenSlug falls back to slug", () => {
  const items = [
    { slug: "sleep", sortOrder: 10 },
    { slug: "daily", sortOrder: 10 },
    { slug: "angry", sortOrder: 0 },
  ].toSorted(compareSortOrderThenSlug);

  assert.deepEqual(items.map((item) => item.slug), ["angry", "daily", "sleep"]);
});

test("nextSortOrder uses max sortOrder plus step", () => {
  assert.equal(nextSortOrder([]), 0);
  assert.equal(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 30 }, { sortOrder: 10 }]), 40);
});

test("parseRequiredInteger rejects non-integer sort order input", () => {
  assert.equal(parseRequiredInteger("-12", "categorySortOrder"), -12);
  assert.throws(
    () => parseRequiredInteger("1.5", "categorySortOrder"),
    /字段必须是整数：categorySortOrder/,
  );
});
