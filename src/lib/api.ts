import type { AboutData, Product, ProductsPage, TechData, Versioned } from "./types";

export const API_BASE = (import.meta.env.PUBLIC_API_BASE_URL || "http://localhost:8787/api/v1").replace(/\/$/, "");
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `API error (${response.status})`);
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const publicContent = <T extends AboutData|TechData|ProductsPage>(kind: string) => api<Versioned<T>>(`/content/${kind}`);
export const publicProducts = () => api<{ products: Product[] }>("/products");
