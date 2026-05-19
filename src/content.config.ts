import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const products = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
	schema: z.object({
		title: z.string(),
		type: z.string(),
		status: z.enum(["構想中", "公開中", "制作中"]),
		summary: z.string(),
		imagePath: z.string(),
		stack: z.array(z.string()),
		order: z.number().int(),
		liveUrl: z.string().optional(),
		githubUrls: z.record(z.string()).optional(),
	}),
});

export const collections = {
	products,
};
