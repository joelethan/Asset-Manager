import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_APP_NAME, resolveAppName } from "./app-brand";

describe("resolveAppName", () => {
  it("uses the configured environment value when present", () => {
    assert.equal(resolveAppName("Atlas Academy"), "Atlas Academy");
  });

  it("falls back to the default brand when the env value is empty", () => {
    assert.equal(resolveAppName("   "), DEFAULT_APP_NAME);
  });
});
