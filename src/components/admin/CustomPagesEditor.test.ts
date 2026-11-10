import { describe, expect, it } from "vitest";
import source from "./CustomPagesEditor.tsx?raw";
import route from "../../pages/[slug].astro?raw";
import layout from "../../layouts/Layout.astro?raw";

describe("custom pages", () => {
  it("supports create, edit, publish and delete controls", () => {
    expect(source).toContain("＋ 固定ページ");
    expect(source).toContain("Markdown本文");
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("<SaveToolbar");
  });
  it("renders public Markdown safely and adds published navigation", () => {
    expect(route).toContain("renderSafeMarkdown(page.body)");
    expect(layout).toContain("publicPages()");
  });
  it("reserves the static legal page slugs", () => {
    expect(source).toContain('"privacy-policy", "use-kiyaku"');
  });
});

describe("legal pages", () => {
  it("links the privacy policy and terms from every public page footer", () => {
    expect(layout).toContain('href="/privacy-policy/"');
    expect(layout).toContain('href="/use-kiyaku/"');
  });
});
