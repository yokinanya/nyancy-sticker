import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_R2_PUBLIC_HOST,
  resolveR2PublicHost,
} from "../lib/r2-public-host";

test("resolveR2PublicHost uses the shared default", () => {
  assert.equal(resolveR2PublicHost(undefined), DEFAULT_R2_PUBLIC_HOST);
});

test("resolveR2PublicHost normalizes a bare hostname", () => {
  assert.equal(resolveR2PublicHost("  R2.Example.Test  "), "r2.example.test");
});

test("resolveR2PublicHost rejects URLs and non-host suffixes", () => {
  const invalidValues = [
    "",
    "https://r2.example.test",
    "r2.example.test/path",
    "r2.example.test?query=1",
    "r2.example.test:443",
  ];
  invalidValues.forEach((value) => {
    assert.throws(() => resolveR2PublicHost(value), /NEXT_PUBLIC_R2_HOST/);
  });
});
