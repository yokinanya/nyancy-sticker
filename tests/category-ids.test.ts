import assert from "node:assert/strict";
import test from "node:test";
import { categoryIdFor, randomCategorySlug } from "../lib/category-ids";

test("categoryIdFor combines character and slug", () => {
  assert.equal(categoryIdFor("miya", "daily"), "miya_daily");
});

test("randomCategorySlug creates valid category slugs", () => {
  const slug = randomCategorySlug();
  assert.match(slug, /^[a-z0-9]{7}$/);
});
