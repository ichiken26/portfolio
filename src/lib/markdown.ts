import { marked, Renderer, type Tokens } from "marked";

marked.setOptions({ gfm: true, breaks: false });

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function safeHref(href: string): string | null {
  const compact = Array.from(href)
    .filter((character) => character.charCodeAt(0) > 32 && character.charCodeAt(0) !== 127)
    .join("")
    .replace(/%(?:0[0-9a-f]|1[0-9a-f]|20|7f)/gi, "")
    .toLowerCase();
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  if (scheme && !["http", "https", "mailto"].includes(scheme)) return null;
  return href;
}

class SafeRenderer extends Renderer {
  override html(): string {
    return "";
  }

  override image({ text }: Tokens.Image): string {
    return escapeAttribute(text);
  }

  override link({ href, title, tokens }: Tokens.Link): string {
    const text = this.parser.parseInline(tokens);
    const safe = safeHref(href);
    if (!safe) return text;
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : "";
    return `<a href="${escapeAttribute(safe)}"${titleAttribute}>${text}</a>`;
  }
}

export function renderSafeMarkdown(source: string): string {
  return marked.parse(source, { async: false, renderer: new SafeRenderer() }) as string;
}
