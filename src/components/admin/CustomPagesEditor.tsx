import { Alert, Badge, Box, Button, Flex, Grid, HStack, Input, InputGroup, Link, Stack, Text, Textarea } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import type { CustomPage } from "../../lib/types";
import { useAutoSave } from "./CmsEditor";
import { DeleteButton, FormField, LoadState, MarkdownPreview, Panel, SaveToolbar } from "./ui";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reserved = new Set(["admin", "api", "about", "tech-stack", "products", "privacy-policy", "use-kiyaku", "_astro", "_image"]);

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
  return (
    <Panel title="固定ページ" kicker="Pages" aside={<Badge size="lg" variant="outline">{pages.length}件</Badge>}>
      <Text color="fg.muted">公開するとページと上部ナビが追加されます。</Text>
      {error && (
        <Alert.Root status="error">
          <Alert.Indicator />
          <Alert.Title role="alert">{error}</Alert.Title>
        </Alert.Root>
      )}
      <Stack gap={2}>
        {pages.map((page) => (
          <Flex key={page.slug} align="center" gap={3} p={3} borderWidth="1px" borderColor="#dce5dc" borderRadius="md" _hover={{ bg: "#f7f8f4" }}>
            <Link href={`/admin/pages/${page.slug}/`} flex="1" minW="0" display="grid" gap={0.5} textDecoration="none">
              <Text as="strong" fontWeight="bold" truncate>{page.title}</Text>
              <Text as="small" color="fg.muted" truncate>/{page.slug}/</Text>
            </Link>
            <Badge colorPalette={page.published ? "teal" : "gray"}>{page.published ? "公開中" : "非公開"}</Badge>
            <DeleteButton onClick={async () => { if (confirm(`${page.title}を削除しますか？`)) { await adminApi(`/pages/${page.slug}`, { method: "DELETE" }); await refresh(); } }}>削除</DeleteButton>
          </Flex>
        ))}
      </Stack>
      <Box asChild>
        <form onSubmit={(event) => { event.preventDefault(); if (valid) void add(); }}>
          <FormField
            label="新しい固定ページ"
            helper={slug && !valid ? <Text as="span" color="red.600">英小文字・数字・ハイフンを使用し、既存ページと異なるslugを指定してください。</Text> : "英小文字・数字・ハイフンで指定します。"}
          >
            <HStack w="full" gap={2} align="stretch">
              <InputGroup startAddon="kokage-studio.com/" flex="1">
                <Input aria-label="新しい固定ページのslug" placeholder="new-page" value={slug} onChange={(event) => setSlug(event.target.value)} />
              </InputGroup>
              <Button type="submit" colorPalette="teal" disabled={!valid}>＋ 固定ページ</Button>
            </HStack>
          </FormField>
        </form>
      </Box>
    </Panel>
  );
}

export function CustomPageEditor({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<CustomPage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminApi<CustomPage>(`/pages/${slug}`).then(setLoaded).catch((cause) => setError(String(cause))); }, [slug]);
  if (error || !loaded) return <LoadState error={error} />;
  return <LoadedCustomPage initial={loaded} />;
}

function LoadedCustomPage({ initial }: { initial: CustomPage }) {
  const saver = useCallback((page: CustomPage) => adminApi<CustomPage>(`/pages/${page.slug}`, { method: "PUT", body: JSON.stringify(page) }), []);
  const { value, setValue, state, saveNow, dirty, saving } = useAutoSave(initial.slug, initial, saver);
  const set = <K extends keyof CustomPage>(key: K, next: CustomPage[K]) => setValue({ ...value, [key]: next });
  return (
    <>
      <SaveToolbar published={value.published} onPublishedChange={(published) => set("published", published)} state={state} dirty={dirty} saving={saving} onSave={() => void saveNow()} />
      <Grid templateColumns={{ base: "1fr", lg: "minmax(0,1fr) minmax(0,1fr)" }} gap={6} alignItems="start">
        <Panel title="ページ設定">
          <FormField label="タイトル"><Input value={value.title} onChange={(event) => set("title", event.target.value)} /></FormField>
          <Grid templateColumns={{ base: "1fr", sm: "2fr 1fr" }} gap={4}>
            <FormField label="ナビ表示名"><Input value={value.navLabel} onChange={(event) => set("navLabel", event.target.value)} /></FormField>
            <FormField label="ナビ表示順"><Input type="number" min="0" value={value.order} onChange={(event) => set("order", Number(event.target.value))} /></FormField>
          </Grid>
          <FormField label="概要"><Textarea rows={3} autoresize value={value.description} onChange={(event) => set("description", event.target.value)} /></FormField>
          <FormField label="Markdown本文"><Textarea rows={20} fontFamily="mono" fontSize="sm" value={value.body} onChange={(event) => set("body", event.target.value)} /></FormField>
        </Panel>
        <Box position={{ lg: "sticky" }} top={{ lg: "150px" }} maxH={{ lg: "calc(100vh - 170px)" }} overflowY={{ lg: "auto" }} borderRadius="lg">
          <Panel title="プレビュー" kicker="Preview">
            <MarkdownPreview source={value.body} />
          </Panel>
        </Box>
      </Grid>
    </>
  );
}
