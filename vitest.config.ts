import { defineConfig } from "vitest/config";

// Astro's tsconfig sets `jsx: "preserve"`; Vite 8 (oxc) honors it, so compile JSX explicitly for tests.
export default defineConfig({
	oxc: { jsx: { runtime: "automatic", importSource: "react" } },
});
