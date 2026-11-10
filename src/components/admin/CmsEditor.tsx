import { Badge, Box, Button, Code, Flex, Grid, Heading, HStack, Image, Input, InputGroup, Link, NativeSelect, Stack, Text, Textarea } from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, adminApi } from "../../lib/api";
import type { AboutBlock, AboutData, Product, ProductsPage, TechData, Versioned } from "../../lib/types";
import { AddButton, DeleteButton, FormField, LoadState, MarkdownPreview, Panel, RemoveRowButton, SaveToolbar, TagsInput, removeAt, replaceAt } from "./ui";

export type Kind = "about" | "tech-stack" | "products";
const uid = () => crypto.randomUUID();
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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
};

export function useAutoSave<T extends { version?: number }>(path: string, initial: T, save: (value: T) => Promise<T>) {
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

type ContentData = AboutData | TechData | ProductsPage;

export function ContentEditor({ kind }: { kind: Kind }) {
  const [loaded, setLoaded] = useState<Versioned<ContentData> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    adminApi<Versioned<ContentData>>(`/content/${kind}`)
      .then(setLoaded)
      .catch((e) => setError(String(e)));
  }, [kind]);
  if (error || !loaded) return <LoadState error={error} />;
  return <LoadedContent key={`${kind}-${loaded.version}`} kind={kind} initial={loaded} />;
}

function LoadedContent({ kind, initial }: { kind: Kind; initial: Versioned<ContentData> }) {
  const saver = useCallback(
    async (v: typeof initial) => adminApi<typeof initial>(`/content/${kind}`, { method: "PUT", body: JSON.stringify(v) }),
    [kind],
  );
  const { value, setValue, state, saveNow, dirty, saving } = useAutoSave(kind, initial, saver);
  const updateData = (data: ContentData) => setValue({ ...value, data });
  return (
    <>
      <SaveToolbar
        published={value.published}
        onPublishedChange={(published) => setValue({ ...value, published })}
        state={state}
        dirty={dirty}
        saving={saving}
        onSave={() => void saveNow()}
      />
      {kind === "about" ? (
        <AboutForm value={value.data as AboutData} onChange={updateData} />
      ) : kind === "tech-stack" ? (
        <TechForm value={value.data as TechData} onChange={updateData} />
      ) : (
        <ProductsPageForm value={value.data as ProductsPage} onChange={updateData} />
      )}
    </>
  );
}

const blockTypes = [
  { type: "text", label: "テキスト" },
  { type: "list", label: "一覧" },
  { type: "links", label: "リンク一覧" },
  { type: "table", label: "表" },
] as const;
const blockLabel = (type: AboutBlock["type"]) => blockTypes.find((b) => b.type === type)?.label ?? type;
const newBlock = (type: AboutBlock["type"]): AboutBlock => {
  switch (type) {
    case "text":
      return { id: uid(), title: "新しい項目", type, text: "" };
    case "table":
      return { id: uid(), title: "新しい表", type, rows: [] };
    case "links":
      return { id: uid(), title: "新しいリンク一覧", type, items: [] };
    case "list":
      return { id: uid(), title: "新しい一覧", type, items: [] };
  }
};

function AboutForm({ value, onChange }: { value: AboutData; onChange: (v: AboutData) => void }) {
  const blocks = value.blocks;
  const update = (i: number, b: AboutBlock) => onChange({ ...value, blocks: replaceAt(blocks, i, b) });
  return (
    <Stack gap={6}>
      <Panel>
        <FormField label="概要">
          <Textarea rows={5} autoresize value={value.overview} onChange={(e) => onChange({ ...value, overview: e.target.value })} />
        </FormField>
      </Panel>
      <Stack gap={4}>
        <Heading size="lg">コンテンツ</Heading>
        {blocks.map((b, i) => (
          <Panel
            key={b.id}
            title={
              <HStack gap={3}>
                <Badge colorPalette="teal" variant="subtle" flexShrink={0}>
                  {blockLabel(b.type)}
                </Badge>
                <Input aria-label="見出し" fontWeight="bold" value={b.title} onChange={(e) => update(i, { ...b, title: e.target.value })} />
              </HStack>
            }
            aside={
              <DeleteButton onClick={() => onChange({ ...value, blocks: removeAt(blocks, i) })}>削除</DeleteButton>
            }
          >
            {b.type === "text" && <Textarea rows={4} autoresize aria-label="本文" value={b.text} onChange={(e) => update(i, { ...b, text: e.target.value })} />}
            {b.type === "list" && <ListEditor items={b.items} onChange={(items) => update(i, { ...b, items })} />}
            {b.type === "links" && <LinkEditor items={b.items} onChange={(items) => update(i, { ...b, items })} />}
            {b.type === "table" && <TableEditor rows={b.rows} onChange={(rows) => update(i, { ...b, rows })} />}
          </Panel>
        ))}
        <HStack wrap="wrap" gap={2}>
          {blockTypes.map(({ type, label }) => (
            <AddButton key={type} onClick={() => onChange({ ...value, blocks: [...blocks, newBlock(type)] })}>
              ＋ {label}
            </AddButton>
          ))}
        </HStack>
      </Stack>
    </Stack>
  );
}

function ListEditor({ items, onChange, type, placeholder }: { items: string[]; onChange: (v: string[]) => void; type?: string; placeholder?: string }) {
  return (
    <Stack gap={2}>
      {items.map((v, i) => (
        <HStack key={i} gap={2}>
          <Input aria-label={`項目 ${i + 1}`} type={type} placeholder={placeholder} value={v} onChange={(e) => onChange(replaceAt(items, i, e.target.value))} />
          <RemoveRowButton label={`項目 ${i + 1} を削除`} onClick={() => onChange(removeAt(items, i))} />
        </HStack>
      ))}
      <AddButton onClick={() => onChange([...items, ""])}>＋ 行</AddButton>
    </Stack>
  );
}

function LinkEditor({ items, onChange }: { items: { label: string; url: string }[]; onChange: (v: { label: string; url: string }[]) => void }) {
  return (
    <Stack gap={2}>
      {items.map((v, i) => (
        <Flex key={i} gap={2} align="center">
          <Grid flex="1" templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={2}>
            <Input aria-label="表示名" placeholder="表示名" value={v.label} onChange={(e) => onChange(replaceAt(items, i, { ...v, label: e.target.value }))} />
            <Input aria-label="URL" type="url" placeholder="https://" value={v.url} onChange={(e) => onChange(replaceAt(items, i, { ...v, url: e.target.value }))} />
          </Grid>
          <RemoveRowButton label="リンクを削除" onClick={() => onChange(removeAt(items, i))} />
        </Flex>
      ))}
      <AddButton onClick={() => onChange([...items, { label: "", url: "" }])}>＋ リンク</AddButton>
    </Stack>
  );
}

function TableEditor({ rows, onChange }: { rows: { label: string; value: string }[]; onChange: (v: { label: string; value: string }[]) => void }) {
  return (
    <Stack gap={2}>
      {rows.map((v, i) => (
        <Flex key={i} gap={2} align="center">
          <Grid flex="1" templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={2}>
            <Input aria-label="左セル" placeholder="項目" value={v.label} onChange={(e) => onChange(replaceAt(rows, i, { ...v, label: e.target.value }))} />
            <Input aria-label="右セル" placeholder="内容" value={v.value} onChange={(e) => onChange(replaceAt(rows, i, { ...v, value: e.target.value }))} />
          </Grid>
          <RemoveRowButton label="行を削除" onClick={() => onChange(removeAt(rows, i))} />
        </Flex>
      ))}
      <AddButton onClick={() => onChange([...rows, { label: "", value: "" }])}>＋ 行</AddButton>
    </Stack>
  );
}

type TechCategory = TechData["categories"][number];
type TechItem = TechCategory["items"][number];
const techColumns = { base: "1fr", md: "2fr 1fr 2fr auto" };

function TechForm({ value, onChange }: { value: TechData; onChange: (v: TechData) => void }) {
  const cats = value.categories;
  const updateCat = (i: number, next: TechCategory) => onChange({ categories: replaceAt(cats, i, next) });
  const updateItem = (i: number, j: number, patch: Partial<TechItem>) =>
    updateCat(i, { ...cats[i], items: replaceAt(cats[i].items, j, { ...cats[i].items[j], ...patch }) });
  return (
    <Stack gap={5}>
      {cats.map((c, i) => (
        <Panel
          key={c.id}
          title={<Input aria-label="大項目名" fontWeight="bold" value={c.name} onChange={(e) => updateCat(i, { ...c, name: e.target.value })} />}
          aside={<DeleteButton onClick={() => onChange({ categories: removeAt(cats, i) })}>削除</DeleteButton>}
        >
          {c.items.length > 0 && (
            <Grid templateColumns={techColumns} gap={2} display={{ base: "none", md: "grid" }} color="fg.muted" fontSize="sm" fontWeight="bold">
              <Text>技術名</Text>
              <Text>対応レベル</Text>
              <Text>タグ（カンマ区切り）</Text>
              <Box w="8" />
            </Grid>
          )}
          {c.items.map((item, j) => (
            <Grid key={item.id} templateColumns={techColumns} gap={2} alignItems="center" pb={{ base: 3, md: 0 }} borderBottomWidth={{ base: "1px", md: 0 }} borderColor="#eef3ed">
              <Input aria-label="技術名" placeholder="技術名" value={item.name} onChange={(e) => updateItem(i, j, { name: e.target.value })} />
              <Input aria-label="対応レベル" placeholder="実務対応" value={item.level} onChange={(e) => updateItem(i, j, { level: e.target.value })} />
              <TagsInput aria-label="タグ（カンマ区切り）" placeholder="TypeScript, JavaScript" value={item.tags} onChange={(tags) => updateItem(i, j, { tags })} />
              <RemoveRowButton label={`${item.name || "技術"}を削除`} onClick={() => updateCat(i, { ...c, items: removeAt(c.items, j) })} />
            </Grid>
          ))}
          <AddButton onClick={() => updateCat(i, { ...c, items: [...c.items, { id: uid(), name: "", level: "", tags: [] }] })}>＋ 技術</AddButton>
        </Panel>
      ))}
      <AddButton onClick={() => onChange({ categories: [...cats, { id: uid(), name: "新しいカテゴリ", items: [] }] })}>＋ 大項目</AddButton>
    </Stack>
  );
}

function ProductsPageForm({ value, onChange }: { value: ProductsPage; onChange: (v: ProductsPage) => void }) {
  return (
    <Stack gap={6}>
      <Panel title="一覧ページ" kicker="Products page">
        <FormField label="タイトル">
          <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </FormField>
        <FormField label="概要">
          <Textarea rows={3} autoresize value={value.summary} onChange={(e) => onChange({ ...value, summary: e.target.value })} />
        </FormField>
      </Panel>
      <ProductsManager />
    </Stack>
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
  const refresh = () => adminApi<{ products: Product[] }>("/products").then((r) => setItems(r.products));
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
    <Stack gap={6}>
      <Panel title="製品一覧" kicker="Products" aside={<Badge size="lg" variant="outline">{items.length}件</Badge>}>
        {items.length === 0 && <Text color="fg.muted">製品はまだありません。</Text>}
        <Stack gap={2}>
          {items.map((p) => (
            <Flex key={p.slug} align="center" gap={3} p={3} borderWidth="1px" borderColor="#dce5dc" borderRadius="md" _hover={{ bg: "#f7f8f4" }}>
              <Link href={`/admin/products/${p.slug}/`} flex="1" minW="0" display="grid" gap={0.5} textDecoration="none">
                <Text as="strong" fontWeight="bold" truncate>
                  {p.title}
                </Text>
                <Text as="small" color="fg.muted" truncate>
                  /products/{p.slug}/
                </Text>
              </Link>
              <Badge colorPalette={p.published ? "teal" : "gray"}>{p.published ? "公開中" : "非公開"}</Badge>
              <DeleteButton
                onClick={async () => {
                  if (confirm(`${p.title}を削除しますか？`)) {
                    await adminApi(`/products/${p.slug}`, { method: "DELETE" });
                    await refresh();
                  }
                }}
              >
                削除
              </DeleteButton>
            </Flex>
          ))}
        </Stack>
      </Panel>
      <Box asChild>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <Panel title="製品を追加" kicker="New product" aside={<Text fontSize="sm" color="fg.muted">非公開で作成されます</Text>}>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1.4fr" }} gap={4}>
              <FormField label="製品名">
                <Input
                  placeholder="例: Memo App"
                  value={title}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    setTitle(nextTitle);
                    setCreateState("");
                    if (!urlTouched) setUrlInput(normalizeProductSlug(nextTitle));
                  }}
                />
              </FormField>
              <FormField label="URL" helper="空白・大文字・記号は自動整形されます。完全なURLの貼り付けも可能です。">
                <InputGroup startAddon="kokage-studio.com/products/">
                  <Input
                    placeholder="memo-app"
                    value={urlInput}
                    onChange={(event) => {
                      setUrlTouched(true);
                      setUrlInput(event.target.value);
                      setCreateState("");
                    }}
                  />
                </InputGroup>
              </FormField>
            </Grid>
            <Flex align="center" justify="space-between" gap={4} wrap="wrap" p={3} bg="#f7f8f4" borderRadius="md">
              <Stack gap={1} minW="0">
                <Text fontSize="xs" fontWeight="bold" color="fg.muted">
                  作成されるURL
                </Text>
                <Code wordBreak="break-all">{slug ? `https://kokage-studio.com/products/${slug}/` : "URLを入力してください"}</Code>
              </Stack>
              <Button type="submit" colorPalette="teal" disabled={!title.trim() || !slug || creating} loading={creating} loadingText="作成中…">
                ＋ 製品を追加して編集
              </Button>
            </Flex>
            {createState && (
              <Text role="status" fontSize="sm" color={createState.startsWith("作成失敗") ? "red.600" : "fg.muted"}>
                {createState}
              </Text>
            )}
          </Panel>
        </form>
      </Box>
    </Stack>
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
  if (error || !loaded) return <LoadState error={error} />;
  return <LoadedProduct initial={loaded} />;
}

const dummyColors = [
  { value: "green", label: "緑" },
  { value: "blue", label: "青" },
  { value: "red", label: "赤" },
  { value: "yellow", label: "黄" },
] as const;

function LoadedProduct({ initial }: { initial: Product }) {
  const [imageStatus, setImageStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const saver = useCallback((v: Product) => adminApi<Product>(`/products/${v.slug}`, { method: "PUT", body: JSON.stringify(v) }), []);
  const { value: p, setValue: setP, state, saveNow, dirty, saving } = useAutoSave(initial.slug, initial, saver);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });
  const upload = async (file: File) => {
    setImageStatus("アップロード中…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await adminApi<{ url: string }>("/images", { method: "POST", body: fd });
      set("imagePath", `${API_BASE.replace(/\/api\/v1$/, "")}${data.url}`);
      setImageStatus("アップロード完了（自動保存待ち）");
    } catch (error) {
      setImageStatus(error instanceof Error ? `アップロード失敗: ${error.message}` : "アップロード失敗");
    }
  };
  return (
    <>
      <SaveToolbar published={p.published} onPublishedChange={(published) => set("published", published)} state={state} dirty={dirty} saving={saving} onSave={() => void saveNow()} />
      <Grid templateColumns={{ base: "1fr", lg: "minmax(0,1fr) minmax(0,1fr)" }} gap={6} alignItems="start">
        <Stack gap={6}>
          <Panel title="基本情報">
            <FormField label="タイトル">
              <Input value={p.title} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <FormField label="概要">
              <Textarea rows={3} autoresize value={p.summary} onChange={(e) => set("summary", e.target.value)} />
            </FormField>
            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
              <FormField label="プロダクト種別">
                <Input value={p.type} onChange={(e) => set("type", e.target.value)} />
              </FormField>
              <FormField label="ステータス">
                <NativeSelect.Root>
                  <NativeSelect.Field value={p.status} onChange={(e) => set("status", e.target.value as Product["status"])}>
                    <option>構想中</option>
                    <option>制作中</option>
                    <option>公開中</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </FormField>
            </Grid>
            <FormField label="技術タグ（カンマ区切り）">
              <TagsInput placeholder="Astro, Cloudflare" value={p.tags} onChange={(tags) => set("tags", tags)} />
            </FormField>
            <FormField label="公開サイトURL">
              <Input type="url" placeholder="https://" value={p.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} />
            </FormField>
          </Panel>
          <Panel title="画像">
            <Text fontSize="sm" color="fg.muted">
              現在の画像: <Code>{imageFileName(p.imagePath)}</Code>
            </Text>
            {imageStatus && (
              <Text role="status" fontSize="sm" color={imageStatus.startsWith("アップロード失敗") ? "red.600" : "teal.700"}>
                {imageStatus}
              </Text>
            )}
            <Stack
              align="center"
              gap={3}
              p={6}
              borderWidth="2px"
              borderStyle="dashed"
              borderColor={dragging ? "teal.500" : "#dce5dc"}
              bg={dragging ? "teal.50" : "#f7f8f4"}
              borderRadius="md"
              textAlign="center"
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file) void upload(file);
              }}
            >
              <Text color="fg.muted">ここへ画像をドロップ、または</Text>
              <Button size="sm" variant="outline" colorPalette="teal" onClick={() => fileInput.current?.click()}>
                ファイルを選択
              </Button>
              <Text fontSize="xs" color="fg.muted">
                JPEG / PNG / GIF・5MiBまで
              </Text>
              <input
                ref={fileInput}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </Stack>
            <FormField label="ダミー画像の色" helper="選択すると画像がダミー画像に置き換わります。">
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={p.dummyColor}
                  onChange={(e) => {
                    const c = e.target.value as Product["dummyColor"];
                    setP({ ...p, dummyColor: c, imagePath: `/images/products/dummy-${c}.svg` });
                  }}
                >
                  {dummyColors.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </FormField>
          </Panel>
          <Panel title="GitHub URL">
            <ListEditor type="url" placeholder="https://github.com/..." items={p.githubUrls} onChange={(v) => set("githubUrls", v)} />
          </Panel>
          <Panel title="記事（Markdown）">
            <Textarea aria-label="記事（Markdown）" rows={18} fontFamily="mono" fontSize="sm" value={p.body} onChange={(e) => set("body", e.target.value)} />
          </Panel>
        </Stack>
        <Box position={{ lg: "sticky" }} top={{ lg: "150px" }} maxH={{ lg: "calc(100vh - 170px)" }} overflowY={{ lg: "auto" }} borderRadius="lg">
          <Panel title="プレビュー" kicker="Preview">
            <Flex align="center" justify="center" aspectRatio={16 / 9} bg="#eef3ed" borderRadius="md" overflow="hidden">
              {p.imagePath ? (
                <Image src={p.imagePath} alt={`${p.title} の画像プレビュー`} maxW="full" maxH="full" objectFit="contain" />
              ) : (
                <Text color="fg.muted">画像未設定</Text>
              )}
            </Flex>
            <Heading as="h2" size="2xl">
              {p.title}
            </Heading>
            <Text color="fg.muted">{p.summary}</Text>
            <MarkdownPreview source={p.body} />
          </Panel>
        </Box>
      </Grid>
    </>
  );
}
