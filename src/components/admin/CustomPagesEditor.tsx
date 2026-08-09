import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { renderSafeMarkdown } from "../../lib/markdown";
import type { CustomPage } from "../../lib/types";
import { useAutoSave } from "./CmsEditor";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reserved = new Set(["admin", "api", "about", "tech-stack", "products", "_astro", "_image"]);

export function CustomPagesManager() {
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const refresh = () => adminApi<{ pages: CustomPage[] }>("/pages").then((result) => setPages(result.pages)).catch((cause) => setError(String(cause)));
  useEffect(() => { void refresh(); }, []);
  const valid = slugPattern.test(slug) && !reserved.has(slug);
  const add = async () => {
    setError("");
    try {
      await adminApi("/pages", { method: "POST", body: JSON.stringify({ slug, title: "新しいページ", navLabel: "新しいページ", description: "", body: "", published: false, order: pages.length + 1 }) });
      const created = slug; setSlug(""); await refresh(); window.location.href = `/admin/pages/${created}/`;
    } catch (cause) { setError(String(cause)); }
  };
  return <section className="custom-pages-manager">
    <h2>固定ページ</h2><p>公開するとページと上部ナビが追加されます。</p>
    {error && <p role="alert">{error}</p>}
    <div className="product-links">{pages.map((page) => <div className="row" key={page.slug}>
      <a href={`/admin/pages/${page.slug}/`}>{page.title} <small>/{page.slug}/</small></a><span>{page.published ? "公開中" : "非公開"}</span>
      <button type="button" onClick={async () => { if (confirm(`${page.title}を削除しますか？`)) { await adminApi(`/pages/${page.slug}`, { method: "DELETE" }); await refresh(); } }}>削除</button>
    </div>)}</div>
    <div className="row"><input aria-label="新しい固定ページのslug" placeholder="new-page" value={slug} onChange={(event) => setSlug(event.target.value)} /><button type="button" disabled={!valid} onClick={() => void add()}>＋ 固定ページ</button></div>
    {slug && !valid && <small>英小文字・数字・ハイフンを使用し、既存ページと異なるslugを指定してください。</small>}
  </section>;
}

export function CustomPageEditor({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<CustomPage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminApi<CustomPage>(`/pages/${slug}`).then(setLoaded).catch((cause) => setError(String(cause))); }, [slug]);
  if (error) return <main className="cms"><p role="alert">{error}</p></main>;
  if (!loaded) return <main className="cms">読み込み中…</main>;
  return <LoadedCustomPage initial={loaded} />;
}

function LoadedCustomPage({ initial }: { initial: CustomPage }) {
  const saver = useCallback((page: CustomPage) => adminApi<CustomPage>(`/pages/${page.slug}`, { method: "PUT", body: JSON.stringify(page) }), []);
  const { value, setValue, state, saveNow, dirty, saving } = useAutoSave(initial.slug, initial, saver);
  const set = <K extends keyof CustomPage>(key: K, next: CustomPage[K]) => setValue({ ...value, [key]: next });
  return <main className="cms"><div className="cms-toolbar"><label className="toggle"><input type="checkbox" checked={value.published} onChange={(event) => set("published", event.target.checked)} /><span>公開する</span></label><output aria-live="polite">{state}</output><button type="button" disabled={!dirty || saving} onClick={() => void saveNow()}>今すぐ保存</button></div>
    <div className="two-col"><div><label className="field"><span>タイトル</span><input value={value.title} onChange={(event) => set("title", event.target.value)} /></label><label className="field"><span>ナビ表示名</span><input value={value.navLabel} onChange={(event) => set("navLabel", event.target.value)} /></label><label className="field"><span>概要</span><textarea value={value.description} onChange={(event) => set("description", event.target.value)} /></label><label className="field"><span>ナビ表示順</span><input type="number" min="0" value={value.order} onChange={(event) => set("order", Number(event.target.value))} /></label><label className="field"><span>Markdown本文</span><textarea className="article" value={value.body} onChange={(event) => set("body", event.target.value)} /></label></div><aside><h2>プレビュー</h2><div dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(value.body) }} /></aside></div>
  </main>;
}
