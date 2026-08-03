import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "./markdown";
describe("renderSafeMarkdown", () => {
  it("renders normal markdown", () => expect(renderSafeMarkdown("## Title")).toContain("<h2>Title</h2>"));
  it("removes scripts and event handlers", () => {
    const html=renderSafeMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(html).not.toContain("script"); expect(html).not.toContain("onerror"); expect(html).not.toContain("<img");
  });
  it("removes javascript links", () => expect(renderSafeMarkdown("[x](javascript:alert(1))")).not.toContain("javascript:"));
});
