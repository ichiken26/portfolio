// @ts-check
import vue from "@astrojs/vue";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	integrations: [vue(), react()],
	output: "server",
	adapter: cloudflare(),
	site: "https://kokage-studio.com",
});
