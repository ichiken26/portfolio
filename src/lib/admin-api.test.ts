import { describe, expect, it } from "vitest";
import editorSource from "../components/admin/CmsEditor.tsx?raw";
import proxySource from "../pages/admin/api/[...path].ts?raw";

describe("admin API transport", () => {
  it("uses a same-origin API path for every editor request", () => {
    expect(editorSource).toContain("adminApi");
    expect(editorSource).not.toContain("`${API_BASE}/admin/");
  });

  it("forwards the Access assertion only to the fixed admin upstream", () => {
    expect(proxySource).toContain('headers.set("cf-access-jwt-assertion", assertion)');
    expect(proxySource).toContain("`${API_BASE}/admin/${path}`");
    expect(proxySource).toContain('redirect: "manual"');
  });
});
