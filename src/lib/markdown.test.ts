import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "./markdown";
describe("renderSafeMarkdown", () => {
  it("renders normal markdown", () => expect(renderSafeMarkdown("## Title")).toContain("<h2>Title</h2>"));
  it("removes scripts and event handlers", () => {
    const html=renderSafeMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(html).not.toContain("script"); expect(html).not.toContain("onerror"); expect(html).not.toContain("<img");
  });
  it("removes javascript links", () => expect(renderSafeMarkdown("[x](javascript:alert(1))")).not.toContain("javascript:"));
  it("removes obfuscated unsafe link schemes", () => {
    expect(renderSafeMarkdown("[x](java%0Ascript:alert(1))")).not.toContain("href=");
    expect(renderSafeMarkdown("[x](data:text/html,test)")).not.toContain("href=");
  });
  it("renders image syntax as escaped alternative text", () => {
    const html = renderSafeMarkdown("![<unsafe>](https://example.com/image.png)");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;unsafe&gt;");
  });
});
