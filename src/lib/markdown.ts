import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });
export function renderSafeMarkdown(source: string): string {
  return sanitizeHtml(marked.parse(source, { async: false }) as string, {
    allowedTags: ["h1","h2","h3","h4","p","ul","ol","li","strong","em","code","pre","blockquote","a","hr","br","table","thead","tbody","tr","th","td"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
    disallowedTagsMode: "discard",
  });
}
