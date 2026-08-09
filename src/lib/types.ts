export type AboutBlock =
  | { id: string; title: string; type: "text"; text: string }
  | { id: string; title: string; type: "list"; items: string[] }
  | { id: string; title: string; type: "links"; items: { label: string; url: string }[] }
  | { id: string; title: string; type: "table"; rows: { label: string; value: string }[] };
export interface AboutData { overview: string; blocks: AboutBlock[] }
export interface TechData { categories: { id: string; name: string; items: { id: string; name: string; level: string; tags: string[] }[] }[] }
export interface ProductsPage { title: string; summary: string }
export interface Product { slug: string; title: string; summary: string; type: string; status: "構想中" | "制作中" | "公開中"; tags: string[]; imagePath: string; dummyColor: "blue"|"green"|"red"|"yellow"; liveUrl: string; githubUrls: string[]; body: string; published: boolean; order: number; version: number }
export interface CustomPage { slug: string; title: string; navLabel: string; description: string; body: string; published: boolean; order: number; version: number; updatedAt?: string }
export interface CustomPageNav { slug: string; title: string; navLabel: string; description: string; order: number }
export interface Versioned<T> { data: T; published: boolean; version: number; updatedAt?: string }
