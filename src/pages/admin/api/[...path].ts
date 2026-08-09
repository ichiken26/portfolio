import type { APIRoute } from "astro";

const API_BASE = (import.meta.env.PUBLIC_API_BASE_URL || "http://localhost:8787/api/v1").replace(/\/$/, "");
const ALLOWED_METHODS = new Set(["GET", "PUT", "POST", "DELETE"]);

export const ALL: APIRoute = async ({ params, request }) => {
  const path = params.path ?? "";
  if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    return Response.json({ error: { message: "Invalid admin API path" } }, { status: 400 });
  }
  if (!ALLOWED_METHODS.has(request.method)) {
    return Response.json({ error: { message: "Method not allowed" } }, { status: 405, headers: { Allow: [...ALLOWED_METHODS].join(", ") } });
  }

  const assertion = request.headers.get("cf-access-jwt-assertion");
  const local = ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
  if (!assertion && !local) {
    return Response.json({ error: { message: "Cloudflare Access authentication required" } }, { status: 401 });
  }

  const upstream = new URL(`${API_BASE}/admin/${path}`);
  upstream.search = new URL(request.url).search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "if-match"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (assertion) headers.set("cf-access-jwt-assertion", assertion);

  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : request.body,
    redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) {
    return Response.json({ error: { message: "The admin API rejected the forwarded Access session" } }, { status: 502 });
  }

  const responseHeaders = new Headers({ "cache-control": "no-store" });
  for (const name of ["content-type", "etag"]) {
    const value = response.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers: responseHeaders });
};
