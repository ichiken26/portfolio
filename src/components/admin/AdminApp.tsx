import { Card, Heading, LinkBox, LinkOverlay, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { ContentEditor, ProductEditor, type Kind } from "./CmsEditor";
import { CustomPageEditor, CustomPagesManager } from "./CustomPagesEditor";
import { AdminFrame } from "./ui";

export type AdminView =
  | { view: "dashboard" }
  | { view: "content"; kind: Kind }
  | { view: "product"; slug: string }
  | { view: "page"; slug: string };

const sections = [
  { href: "/admin/about/", title: "About", description: "概要、略歴、対応領域、活動" },
  { href: "/admin/tech-stack/", title: "Tech Stack", description: "カテゴリと技術項目" },
  { href: "/admin/products/", title: "Products", description: "一覧とプロダクト詳細" },
];

function Dashboard() {
  return (
    <Stack gap={8}>
      <Text color="fg.muted">編集するコンテンツを選択してください。変更は各画面で1秒後に自動保存されます。</Text>
      <SimpleGrid as="nav" aria-label="CMS sections" columns={{ base: 1, md: 3 }} gap={5}>
        {sections.map((section) => (
          <LinkBox key={section.href} asChild>
            <Card.Root variant="outline" bg="white" borderColor="#dce5dc" transition="all 0.15s" _hover={{ borderColor: "teal.500", shadow: "md", transform: "translateY(-2px)" }}>
              <Card.Body gap={2}>
                <Heading size="xl"><LinkOverlay href={section.href}>{section.title}</LinkOverlay></Heading>
                <Text color="fg.muted">{section.description}</Text>
              </Card.Body>
            </Card.Root>
          </LinkBox>
        ))}
      </SimpleGrid>
      <CustomPagesManager />
    </Stack>
  );
}

export function AdminApp(props: AdminView & { title: string }) {
  return (
    <AdminFrame title={props.title}>
      {props.view === "dashboard" ? <Dashboard />
        : props.view === "content" ? <ContentEditor kind={props.kind} />
        : props.view === "product" ? <ProductEditor slug={props.slug} />
        : <CustomPageEditor slug={props.slug} />}
    </AdminFrame>
  );
}
