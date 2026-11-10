import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  ChakraProvider,
  CloseButton,
  Container,
  createSystem,
  defaultConfig,
  defineConfig,
  Field,
  Flex,
  Heading,
  HStack,
  Input,
  Link,
  Spinner,
  Stack,
  Switch,
  Text,
  type ButtonProps,
  type InputProps,
} from "@chakra-ui/react";
import { useState, type ReactNode } from "react";
import { renderSafeMarkdown } from "../../lib/markdown";

const fontStack = 'Inter, "Noto Sans JP", "Hiragino Sans", "Yu Gothic UI", Meiryo, system-ui, sans-serif';

export const adminSystem = createSystem(
  defaultConfig,
  defineConfig({
    globalCss: {
      "html, body": { bg: "#f7f8f4", color: "#17211d", minHeight: "100%" },
    },
    theme: {
      tokens: {
        fonts: { body: { value: fontStack }, heading: { value: fontStack } },
      },
    },
  }),
);

export const splitTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
export const replaceAt = <T,>(items: T[], index: number, next: T) => items.map((item, n) => (n === index ? next : item));
export const removeAt = <T,>(items: T[], index: number) => items.filter((_, n) => n !== index);

export function AdminFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ChakraProvider value={adminSystem}>
      <Box minH="100vh" bg="#f7f8f4">
        <Flex
          as="header"
          position="sticky"
          top="0"
          zIndex="sticky"
          align="center"
          gap={{ base: 2, md: 5 }}
          wrap="wrap"
          px={{ base: 4, md: 10 }}
          py={3}
          bg="rgba(247,248,244,0.92)"
          backdropFilter="blur(12px)"
          borderBottomWidth="1px"
          borderColor="#dce5dc"
        >
          <Link href="/admin/" fontWeight="extrabold" color="teal.700" textDecoration="none">
            KOKAGE CMS
          </Link>
          <Heading as="h1" size="md" flex="1" minW="0" truncate order={{ base: 3, md: 0 }} flexBasis={{ base: "100%", md: "auto" }}>
            {title}
          </Heading>
          <Link href="/" target="_blank" rel="noreferrer noopener" fontWeight="bold" color="teal.700" ms={{ base: "auto", md: 0 }}>
            サイトを表示 ↗
          </Link>
        </Flex>
        <Container as="main" maxW="6xl" py={{ base: 6, md: 8 }} pb={20}>
          {children}
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export function LoadState({ error }: { error?: string }) {
  if (error)
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Title role="alert">{error}</Alert.Title>
      </Alert.Root>
    );
  return (
    <HStack color="fg.muted" gap={3}>
      <Spinner size="sm" />
      <Text>読み込み中…</Text>
    </HStack>
  );
}

const statePalette = (state: string) =>
  state.startsWith("保存失敗") ? "red" : state === "保存済み" ? "green" : state === "保存中…" ? "blue" : "orange";

export function SaveToolbar({
  published,
  onPublishedChange,
  state,
  dirty,
  saving,
  onSave,
}: {
  published: boolean;
  onPublishedChange: (published: boolean) => void;
  state: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Card.Root position="sticky" top={{ base: "92px", md: "62px" }} zIndex="docked" mb={6} size="sm" shadow="sm">
      <Card.Body>
        <Flex align="center" gap={4} wrap="wrap">
          <Switch.Root colorPalette="teal" checked={published} onCheckedChange={(event) => onPublishedChange(event.checked)}>
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label fontWeight="bold">公開する</Switch.Label>
          </Switch.Root>
          <Badge colorPalette={published ? "teal" : "gray"} variant="subtle">
            {published ? "公開中" : "非公開"}
          </Badge>
          <Box flex="1" />
          <Badge as="output" aria-live="polite" colorPalette={statePalette(state)} variant="surface" size="lg" maxW="full" whiteSpace="normal">
            {state}
          </Badge>
          <Button size="sm" colorPalette="teal" onClick={onSave} disabled={!dirty || saving} loading={saving}>
            今すぐ保存
          </Button>
        </Flex>
      </Card.Body>
    </Card.Root>
  );
}

export function FormField({ label, helper, children }: { label: string; helper?: ReactNode; children: ReactNode }) {
  return (
    <Field.Root>
      <Field.Label fontWeight="bold">{label}</Field.Label>
      {children}
      {helper && <Field.HelperText>{helper}</Field.HelperText>}
    </Field.Root>
  );
}

export function Panel({ title, kicker, aside, children }: { title?: ReactNode; kicker?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card.Root variant="outline" bg="white" borderColor="#dce5dc">
      {(title || aside) && (
        <Card.Header>
          <Flex align="flex-start" justify="space-between" gap={3}>
            <Box minW="0" flex="1">
              {kicker && (
                <Text fontSize="xs" fontWeight="extrabold" color="teal.700" textTransform="uppercase" mb={1}>
                  {kicker}
                </Text>
              )}
              {title && <Heading size="md">{title}</Heading>}
            </Box>
            {aside}
          </Flex>
        </Card.Header>
      )}
      <Card.Body>
        <Stack gap={4}>{children}</Stack>
      </Card.Body>
    </Card.Root>
  );
}

export const AddButton = (props: ButtonProps) => <Button size="sm" variant="outline" colorPalette="teal" alignSelf="flex-start" {...props} />;
export const DeleteButton = (props: ButtonProps) => <Button size="sm" variant="ghost" colorPalette="red" flexShrink={0} {...props} />;
export const RemoveRowButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <CloseButton size="sm" aria-label={label} onClick={onClick} flexShrink={0} />
);

/** Comma-separated tags input that keeps the raw text while typing. */
export function TagsInput({ value, onChange, ...props }: { value: string[]; onChange: (tags: string[]) => void } & Omit<InputProps, "value" | "onChange">) {
  const [text, setText] = useState(value.join(", "));
  return (
    <Input
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(splitTags(event.target.value));
      }}
    />
  );
}

const markdownCss = {
  lineHeight: "1.85",
  color: "#3d4a45",
  overflowWrap: "anywhere",
  "& h1": { fontSize: "2xl", fontWeight: "bold", mt: 6, mb: 3 },
  "& h2": { fontSize: "xl", fontWeight: "bold", mt: 6, mb: 3 },
  "& h3": { fontSize: "lg", fontWeight: "bold", mt: 5, mb: 2 },
  "& p": { my: 3 },
  "& ul": { listStyleType: "disc", ps: 6, my: 3 },
  "& ol": { listStyleType: "decimal", ps: 6, my: 3 },
  "& a": { color: "teal.700", fontWeight: "bold", textDecoration: "underline" },
  "& code": { bg: "#eef3ed", px: 1, borderRadius: "sm", fontSize: "0.9em" },
  "& pre": { overflowX: "auto", p: 4, my: 3, bg: "#f4f7f3", borderWidth: "1px", borderColor: "#dce5dc", borderRadius: "md" },
  "& pre code": { bg: "transparent", p: 0 },
  "& blockquote": { borderStartWidth: "4px", borderColor: "#dce5dc", ps: 4, color: "fg.muted" },
  "& table": { width: "full", borderCollapse: "collapse", my: 3 },
  "& th, & td": { borderWidth: "1px", borderColor: "#dce5dc", p: 2, textAlign: "start" },
};

export function MarkdownPreview({ source }: { source: string }) {
  return <Box css={markdownCss} dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(source) }} />;
}
