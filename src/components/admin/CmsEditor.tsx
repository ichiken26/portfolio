import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, adminApi } from "../../lib/api";
import { renderSafeMarkdown } from "../../lib/markdown";
import type {
  AboutBlock,
  AboutData,
  Product,
  ProductsPage,
  TechData,
  Versioned,
} from "../../lib/types";
type Kind = "about" | "tech-stack" | "products";
const uid = () => crypto.randomUUID();
const splitTags = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const imageFileName = (value: string) => {
  if (!value) return "未設定";
  try {
    const pathname = new URL(value, "https://cms.local").pathname;
    return decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? value);
  } catch {
    return value;
  }
};
export const normalizeProductSlug = (value: string) => {
  let candidate = value.trim();
  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = decodeURIComponent(new URL(candidate).pathname);
    } catch {
      return "";
    }
  }
  candidate = candidate.replace(/^\/+|\/+$/g, "").replace(/^products\/+/, "");
  return candidate
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
};

export function useAutoSave<T extends { version?: number }>(
  path: string,
  initial: T,
  save: (value: T) => Promise<T>,
) {
  const [value, setStoredValue] = useState(initial);
  const [state, setState] = useState("保存済み");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const valueRef = useRef(initial);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const retryBlockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setValue = useCallback((next: T) => {
    valueRef.current = next;
    dirtyRef.current = true;
    retryBlockedRef.current = false;
    setStoredValue(next);
    setDirty(true);
    setState("未保存");
  }, []);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!dirtyRef.current || savingRef.current) return;

    const snapshot = valueRef.current;
    dirtyRef.current = false;
    savingRef.current = true;
    setDirty(false);
    setSaving(true);
    setState("保存中…");
    try {
      const saved = await save(snapshot);
      if (dirtyRef.current) {
        const edited = { ...valueRef.current, version: saved.version };
        valueRef.current = edited;
        setStoredValue(edited);
        setDirty(true);
        setState("未保存");
      } else {
        valueRef.current = saved;
        setStoredValue(saved);
        setState("保存済み");
      }
    } catch (error) {
      dirtyRef.current = true;
      retryBlockedRef.current = true;
      setDirty(true);
      setState(error instanceof Error ? `保存失敗: ${error.message}` : "保存失敗");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [save]);

  useEffect(() => {
    if (!dirty || saving || retryBlockedRef.current) return;
    timerRef.current = setTimeout(() => void saveNow(), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dirty, path, saveNow, saving, value]);

  return { value, setValue, state, saveNow, dirty, saving };
}

export function ContentEditor({ kind }: { kind: Kind }) {
  const [loaded, setLoaded] = useState<Versioned<
    AboutData | TechData | ProductsPage
  > | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminApi<Versioned<AboutData | TechData | ProductsPage>>(
      `/content/${kind}`,
    )
      .then(setLoaded)
      .catch((e) => setError(String(e)));
  }, [kind]);
  if (error)
    return (
      <main className="cms">
        <p role="alert">{error}</p>
      </main>
    );
  if (!loaded)
    return (
      <main className="cms">
        <p>読み込み中…</p>
      </main>
    );
  return (
    <LoadedContent
      key={`${kind}-${loaded.version}`}
      kind={kind}
      initial={loaded}
    />
  );
}
function LoadedContent({
  kind,
  initial,
}: {
  kind: Kind;
  initial: Versioned<AboutData | TechData | ProductsPage>;
}) {
  const saver = useCallback(
    async (v: typeof initial) =>
      adminApi<typeof initial>(`/content/${kind}`, {
        method: "PUT",
        body: JSON.stringify(v),
      }),
    [kind],
  );
  const { value, setValue, state, saveNow, dirty, saving } = useAutoSave(kind, initial, saver);
  const updateData = (data: typeof value.data) => setValue({ ...value, data });
  return (
    <main className="cms">
      <div className="cms-toolbar">
        <label className="toggle">
          <input
            type="checkbox"
            checked={value.published}
            onChange={(e) =>
              setValue({ ...value, published: e.target.checked })
            }
          />
          <span>公開する</span>
        </label>
        <output aria-live="polite">{state}</output>
        <button type="button" onClick={() => void saveNow()} disabled={!dirty || saving}>今すぐ保存</button>
      </div>
      {kind === "about" ? (
        <AboutForm value={value.data as AboutData} onChange={updateData} />
      ) : kind === "tech-stack" ? (
        <TechForm value={value.data as TechData} onChange={updateData} />
      ) : (
        <ProductsPageForm
          value={value.data as ProductsPage}
          onChange={updateData}
        />
      )}
    </main>
  );
}
function AboutForm({
  value,
  onChange,
}: {
  value: AboutData;
  onChange: (v: AboutData) => void;
}) {
  const blocks = value.blocks;
  const update = (i: number, b: AboutBlock) =>
    onChange({ ...value, blocks: blocks.map((x, n) => (n === i ? b : x)) });
  return (
    <>
      <Field label="概要">
        <textarea
          value={value.overview}
          onChange={(e) => onChange({ ...value, overview: e.target.value })}
        />
      </Field>
      <section>
        <h2>コンテンツ</h2>
        {blocks.map((b, i) => (
          <div className="editor-card" key={b.id}>
            <div className="row">
              <input
                aria-label="見出し"
                value={b.title}
                onChange={(e) => update(i, { ...b, title: e.target.value })}
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    blocks: blocks.filter((_, n) => n !== i),
                  })
                }
              >
                削除
              </button>
            </div>
            {b.type === "text" && (
              <textarea
                value={b.text}
                onChange={(e) => update(i, { ...b, text: e.target.value })}
              />
            )}{" "}
            {b.type === "list" && (
              <ListEditor
                items={b.items}
                onChange={(items) => update(i, { ...b, items })}
              />
            )}{" "}
            {b.type === "links" && (
              <LinkEditor
                items={b.items}
                onChange={(items) => update(i, { ...b, items })}
              />
            )}{" "}
            {b.type === "table" && (
              <TableEditor
                rows={b.rows}
                onChange={(rows) => update(i, { ...b, rows })}
              />
            )}
          </div>
        ))}
        <div className="button-row">
          {(["text", "list", "links", "table"] as const).map((type) => (
            <button
              type="button"
              key={type}
              onClick={() =>
                onChange({
                  ...value,
                  blocks: [
                    ...blocks,
                    type === "text"
                      ? { id: uid(), title: "新しい項目", type, text: "" }
                      : type === "table"
                        ? { id: uid(), title: "新しい表", type, rows: [] }
                        : type === "links"
                          ? {
                              id: uid(),
                              title: "新しいリンク一覧",
                              type,
                              items: [],
                            }
                          : { id: uid(), title: "新しい一覧", type, items: [] },
                  ],
                })
              }
            >
              ＋ {type}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
function ListEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      {items.map((v, i) => (
        <div className="row" key={i}>
          <input
            aria-label={`項目 ${i + 1}`}
            value={v}
            onChange={(e) =>
              onChange(items.map((x, n) => (n === i ? e.target.value : x)))
            }
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, n) => n !== i))}
          >
            －
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])}>
        ＋ 行
      </button>
    </div>
  );
}
function LinkEditor({
  items,
  onChange,
}: {
  items: { label: string; url: string }[];
  onChange: (v: { label: string; url: string }[]) => void;
}) {
  return (
    <div>
      {items.map((v, i) => (
        <div className="row" key={i}>
          <input
            aria-label="表示名"
            value={v.label}
            onChange={(e) =>
              onChange(
                items.map((x, n) =>
                  n === i ? { ...x, label: e.target.value } : x,
                ),
              )
            }
          />
          <input
            aria-label="URL"
            type="url"
            value={v.url}
            onChange={(e) =>
              onChange(
                items.map((x, n) =>
                  n === i ? { ...x, url: e.target.value } : x,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, n) => n !== i))}
          >
            －
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { label: "", url: "" }])}
      >
        ＋ リンク
      </button>
    </div>
  );
}
function TableEditor({
  rows,
  onChange,
}: {
  rows: { label: string; value: string }[];
  onChange: (v: { label: string; value: string }[]) => void;
}) {
  return (
    <div>
      {rows.map((v, i) => (
        <div className="row" key={i}>
          <input
            aria-label="左セル"
            value={v.label}
            onChange={(e) =>
              onChange(
                rows.map((x, n) =>
                  n === i ? { ...x, label: e.target.value } : x,
                ),
              )
            }
          />
          <input
            aria-label="右セル"
            value={v.value}
            onChange={(e) =>
              onChange(
                rows.map((x, n) =>
                  n === i ? { ...x, value: e.target.value } : x,
                ),
              )
            }
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, n) => n !== i))}
          >
            －
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { label: "", value: "" }])}
      >
        ＋ 行
      </button>
    </div>
  );
}
function TechForm({
  value,
  onChange,
}: {
  value: TechData;
  onChange: (v: TechData) => void;
}) {
  const cats = value.categories;
  return (
    <section>
      {cats.map((c, i) => (
        <div className="editor-card" key={c.id}>
          <div className="row">
            <input
              aria-label="大項目名"
              value={c.name}
              onChange={(e) =>
                onChange({
                  categories: cats.map((x, n) =>
                    n === i ? { ...x, name: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              onClick={() =>
                onChange({ categories: cats.filter((_, n) => n !== i) })
              }
            >
              削除
            </button>
          </div>
          {c.items.map((item, j) => (
            <div className="grid4" key={item.id}>
              <input
                aria-label="技術名"
                value={item.name}
                onChange={(e) =>
                  onChange({
                    categories: cats.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            items: x.items.map((y, m) =>
                              m === j ? { ...y, name: e.target.value } : y,
                            ),
                          }
                        : x,
                    ),
                  })
                }
              />
              <input
                aria-label="対応レベル"
                value={item.level}
                onChange={(e) =>
                  onChange({
                    categories: cats.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            items: x.items.map((y, m) =>
                              m === j ? { ...y, level: e.target.value } : y,
                            ),
                          }
                        : x,
                    ),
                  })
                }
              />
              <input
                aria-label="タグ（カンマ区切り）"
                value={item.tags.join(", ")}
                onChange={(e) =>
                  onChange({
                    categories: cats.map((x, n) =>
                      n === i
                        ? {
                            ...x,
                            items: x.items.map((y, m) =>
                              m === j
                                ? { ...y, tags: splitTags(e.target.value) }
                                : y,
                            ),
                          }
                        : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    categories: cats.map((x, n) =>
                      n === i
                        ? { ...x, items: x.items.filter((_, m) => m !== j) }
                        : x,
                    ),
                  })
                }
              >
                －
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                categories: cats.map((x, n) =>
                  n === i
                    ? {
                        ...x,
                        items: [
                          ...x.items,
                          { id: uid(), name: "", level: "", tags: [] },
                        ],
                      }
                    : x,
                ),
              })
            }
          >
            ＋ 技術
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({
            categories: [
              ...cats,
              { id: uid(), name: "新しいカテゴリ", items: [] },
            ],
          })
        }
      >
        ＋ 大項目
      </button>
    </section>
  );
}
function ProductsPageForm({
  value,
  onChange,
}: {
  value: ProductsPage;
  onChange: (v: ProductsPage) => void;
}) {
  return (
    <>
      <Field label="タイトル">
        <input
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </Field>
      <Field label="概要">
        <textarea
          value={value.summary}
          onChange={(e) => onChange({ ...value, summary: e.target.value })}
        />
      </Field>
      <ProductsManager />
    </>
  );
}
function ProductsManager() {
  const [items, setItems] = useState<Product[]>([]);
  const [title, setTitle] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [urlTouched, setUrlTouched] = useState(false);
  const [createState, setCreateState] = useState("");
  const [creating, setCreating] = useState(false);
  const slug = normalizeProductSlug(urlInput);
  const refresh = () =>
    adminApi<{ products: Product[] }>("/products").then((r) =>
      setItems(r.products),
    );
  useEffect(() => {
    void refresh();
  }, []);
  const add = async () => {
    if (!title.trim() || !slug || creating) return;
    setCreating(true);
    setCreateState("製品を作成中…");
    try {
      await adminApi("/products", {
        method: "POST",
        body: JSON.stringify({
          slug,
          title: title.trim(),
          summary: "",
          type: "Web App",
          status: "制作中",
          tags: [],
          imagePath: "/images/products/dummy-green.svg",
          dummyColor: "green",
          liveUrl: "",
          githubUrls: [],
          body: "",
          published: false,
          order: Math.max(0, ...items.map((item) => item.order)) + 1,
        }),
      });
      window.location.assign(`/admin/products/${slug}/`);
    } catch (error) {
      setCreateState(error instanceof Error ? `作成失敗: ${error.message}` : "作成失敗");
      setCreating(false);
    }
  };
  return (
    <section className="products-manager">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Products</p>
          <h2>製品一覧</h2>
        </div>
        <span className="item-count">{items.length}件</span>
      </div>
      <div className="product-links product-list">
        {items.map((p) => (
          <div className="product-list-item" key={p.slug}>
            <a href={`/admin/products/${p.slug}/`}>
              <strong>{p.title}</strong>
              <small>/products/{p.slug}/</small>
            </a>
            <button
              className="danger-button"
              type="button"
              onClick={async () => {
                if (confirm(`${p.title}を削除しますか？`)) {
                  await adminApi(`/products/${p.slug}`, { method: "DELETE" });
                  await refresh();
                }
              }}
            >
              削除
            </button>
          </div>
        ))}
      </div>
      <form className="product-create-card" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <div className="product-create-heading">
          <div>
            <p className="section-kicker">New product</p>
            <h3>製品を追加</h3>
          </div>
          <span>非公開で作成されます</span>
        </div>
        <div className="product-create-grid">
          <label className="field">
            <span>製品名</span>
            <input
              placeholder="例: Memo App"
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value;
                setTitle(nextTitle);
                setCreateState("");
                if (!urlTouched) setUrlInput(normalizeProductSlug(nextTitle));
              }}
            />
          </label>
          <label className="field">
            <span>URL</span>
            <div className="product-url-input">
              <span>kokage-studio.com/products/</span>
              <input
                aria-describedby="product-url-help"
                placeholder="memo-app"
                value={urlInput}
                onChange={(event) => {
                  setUrlTouched(true);
                  setUrlInput(event.target.value);
                  setCreateState("");
                }}
              />
            </div>
            <small id="product-url-help">
              空白・大文字・記号は自動整形されます。完全なURLの貼り付けも可能です。
            </small>
          </label>
        </div>
        <div className="product-create-footer">
          <div className="product-url-preview">
            <span>作成されるURL</span>
            <code>{slug ? `https://kokage-studio.com/products/${slug}/` : "URLを入力してください"}</code>
          </div>
          <button className="primary-button" type="submit" disabled={!title.trim() || !slug || creating}>
            {creating ? "作成中…" : "＋ 製品を追加して編集"}
          </button>
        </div>
        {createState && <p className={createState.startsWith("作成失敗") ? "form-message error" : "form-message"} role="status">{createState}</p>}
      </form>
    </section>
  );
}
export function ProductEditor({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<Product | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminApi<Product>(`/products/${slug}`)
      .then(setLoaded)
      .catch((e) => setError(String(e)));
  }, [slug]);
  if (error)
    return (
      <main className="cms">
        <p role="alert">{error}</p>
      </main>
    );
  if (!loaded) return <main className="cms">読み込み中…</main>;
  return <LoadedProduct initial={loaded} />;
}
function LoadedProduct({ initial }: { initial: Product }) {
  const [imageStatus, setImageStatus] = useState("");
  const saver = useCallback(
    (v: Product) =>
      adminApi<Product>(`/products/${v.slug}`, {
        method: "PUT",
        body: JSON.stringify(v),
      }),
    [],
  );
  const {
    value: p,
    setValue: setP,
    state,
    saveNow,
    dirty,
    saving,
  } = useAutoSave(initial.slug, initial, saver);
  const set = <K extends keyof Product>(k: K, v: Product[K]) =>
    setP({ ...p, [k]: v });
  const upload = async (file: File) => {
    setImageStatus("アップロード中…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await adminApi<{ url: string }>("/images", {
        method: "POST",
        body: fd,
      });
      set("imagePath", `${API_BASE.replace(/\/api\/v1$/, "")}${data.url}`);
      setImageStatus("アップロード完了（自動保存待ち）");
    } catch (error) {
      setImageStatus(error instanceof Error ? `アップロード失敗: ${error.message}` : "アップロード失敗");
    }
  };
  return (
    <main className="cms">
      <div className="cms-toolbar">
        <label className="toggle">
          <input
            type="checkbox"
            checked={p.published}
            onChange={(e) => set("published", e.target.checked)}
          />{" "}
          公開する
        </label>
        <output aria-live="polite">{state}</output>
        <button type="button" onClick={() => void saveNow()} disabled={!dirty || saving}>今すぐ保存</button>
      </div>
      <div className="two-col">
        <div>
          <Field label="タイトル">
            <input
              value={p.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label="概要">
            <textarea
              value={p.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          </Field>
          <Field label="プロダクト種別">
            <input
              value={p.type}
              onChange={(e) => set("type", e.target.value)}
            />
          </Field>
          <Field label="ステータス">
            <select
              value={p.status}
              onChange={(e) =>
                set("status", e.target.value as Product["status"])
              }
            >
              <option>構想中</option>
              <option>制作中</option>
              <option>公開中</option>
            </select>
          </Field>
          <Field label="技術タグ（カンマ区切り）">
            <input
              value={p.tags.join(", ")}
              onChange={(e) => set("tags", splitTags(e.target.value))}
            />
          </Field>
          <Field label="公開サイトURL">
            <input
              type="url"
              value={p.liveUrl}
              onChange={(e) => set("liveUrl", e.target.value)}
            />
          </Field>
          <Field label="画像">
            <small className="current-image-name">
              現在の画像: <code>{imageFileName(p.imagePath)}</code>
            </small>
            {imageStatus && <span className="image-upload-status" role="status">{imageStatus}</span>}
            <span
              className="drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files[0];
                if (file) void upload(file);
              }}
            >
              ここへ画像をドロップ、または
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) =>
                  e.target.files?.[0] && void upload(e.target.files[0])
                }
              />
            </span>
            <select
              value={p.dummyColor}
              onChange={(e) => {
                const c = e.target.value as Product["dummyColor"];
                setP({
                  ...p,
                  dummyColor: c,
                  imagePath: `/images/products/dummy-${c}.svg`,
                });
              }}
            >
              <option value="green">緑</option>
              <option value="blue">青</option>
              <option value="red">赤</option>
              <option value="yellow">黄</option>
            </select>
          </Field>
          <Field label="GitHub URL">
            <ListEditor
              items={p.githubUrls}
              onChange={(v) => set("githubUrls", v)}
            />
          </Field>
          <Field label="記事（Markdown）">
            <textarea
              className="article"
              value={p.body}
              onChange={(e) => set("body", e.target.value)}
            />
          </Field>
        </div>
        <aside>
          <h2>プレビュー</h2>
          <div className="preview-image-frame">
            {p.imagePath ? <img className="preview-image" src={p.imagePath} alt={`${p.title} の画像プレビュー`} /> : <span>画像未設定</span>}
          </div>
          <h1>{p.title}</h1>
          <p>{p.summary}</p>
          <article
            dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(p.body) }}
          />
        </aside>
      </div>
    </main>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
