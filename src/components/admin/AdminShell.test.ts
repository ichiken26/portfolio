import { describe, expect, it } from "vitest";
import source from "./AdminShell.astro?raw";

describe("AdminShell document metadata", () => {
  it("declares UTF-8 before rendering CMS content", () => {
    expect(source).toContain('<html lang="ja">');
    expect(source).toContain('<meta charset="UTF-8" />');
    expect(source.indexOf('<meta charset="UTF-8" />')).toBeLessThan(source.indexOf("<slot />"));
  });
});
