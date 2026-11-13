import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPostAuthRedirect } from "./auth-flow";

describe("getPostAuthRedirect", () => {
  it("routes users with memberships to dashboard", () => {
    assert.equal(getPostAuthRedirect({ memberships: [{ schoolId: "school-1" }] }), "/dashboard");
  });

  it("routes users without memberships to create-school flow", () => {
    assert.equal(getPostAuthRedirect({ memberships: [] }), "/schools-create");
  });

  it("falls back to create-school flow when no profile is available", () => {
    assert.equal(getPostAuthRedirect(null), "/schools-create");
  });
});
