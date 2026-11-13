import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDashboardQueryOptions } from "./dashboard-query";

describe("getDashboardQueryOptions", () => {
  it("keeps previous dashboard data while a refresh is in flight", () => {
    const previousData = { students: { total: 42 } };
    const options = getDashboardQueryOptions("school-1");

    assert.equal(options.enabled, true);
    assert.ok(options.staleTime && options.staleTime > 0);
    assert.equal(options.placeholderData?.(previousData), previousData);
  });

  it("disables the query until a school is selected", () => {
    const options = getDashboardQueryOptions("");
    assert.equal(options.enabled, false);
  });
});
