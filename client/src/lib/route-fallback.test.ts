import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFallbackRoute } from "./route-fallback";

describe("getFallbackRoute", () => {
  it("redirects anonymous users to login", () => {
    assert.equal(getFallbackRoute({ isAuthenticated: false, hasMemberships: false }), "/login");
  });

  it("redirects users without schools to create school", () => {
    assert.equal(getFallbackRoute({ isAuthenticated: true, hasMemberships: false }), "/schools-create");
  });

  it("redirects members to dashboard", () => {
    assert.equal(getFallbackRoute({ isAuthenticated: true, hasMemberships: true }), "/dashboard");
  });
});
