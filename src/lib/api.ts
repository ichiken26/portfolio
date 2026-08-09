import type { AboutData, CustomPageNav, Product, ProductsPage, TechData, Versioned } from "./types";

export const API_BASE = (import.meta.env.PUBLIC_API_BASE_URL || "http://localhost:8787/api/v1").replace(/\/$/, "");
export const ADMIN_API_BASE = "/admin/api";
export async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}${path}`, { ...init, headers, credentials: "same-origin" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `API error (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const api = <T>(path: string, init?: RequestInit) => request<T>(API_BASE, path, init);
export const adminApi = <T>(path: string, init?: RequestInit) => request<T>(ADMIN_API_BASE, path, init);
export const publicContent = <T extends AboutData|TechData|ProductsPage>(kind: string) => api<Versioned<T>>(`/content/${kind}`);
export const publicProducts = () => api<{ products: Product[] }>("/products");
export const publicPages = () => api<{ pages: CustomPageNav[] }>("/pages");
