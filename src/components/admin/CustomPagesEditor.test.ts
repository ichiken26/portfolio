import { describe, expect, it } from "vitest";
import source from "./CustomPagesEditor.tsx?raw";
import route from "../../pages/[slug].astro?raw";
import layout from "../../layouts/Layout.astro?raw";

describe("custom pages", () => {
  it("supports create, edit, publish and delete controls", () => {
    expect(source).toContain("＋ 固定ページ");
    expect(source).toContain("Markdown本文");
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("今すぐ保存");
  });
  it("renders public Markdown safely and adds published navigation", () => {
    expect(route).toContain("renderSafeMarkdown(page.body)");
    expect(layout).toContain("publicPages()");
  });
});
