import { describe, expect, it } from "vitest";
import source from "./AdminShell.astro?raw";
import app from "./AdminApp.tsx?raw";
import ui from "./ui.tsx?raw";

describe("AdminShell document metadata", () => {
  it("declares UTF-8 before rendering CMS content", () => {
    expect(source).toContain('<html lang="ja">');
    expect(source).toContain('<meta charset="UTF-8" />');
    expect(source.indexOf('<meta charset="UTF-8" />')).toBeLessThan(source.indexOf("<slot />"));
  });

  it("keeps the CMS out of search indexes", () => {
    expect(source).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it("renders every admin view inside the Chakra UI provider", () => {
    expect(ui).toContain("<ChakraProvider value={adminSystem}>");
    expect(app).toContain("<AdminFrame title={props.title}>");
  });
});
