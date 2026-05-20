export type SkillLevel = "実務対応" | "学習中" | "制作対応";

export interface TechStack {
	name: string;
	category: string;
	level: SkillLevel;
	tags: string[];
}

export const techStacks: TechStack[] = [
	{
		name: "Vue / Nuxt",
		category: "Frontend",
		level: "実務対応",
		tags: ["TypeScript", "JavaScript"],
	},
	{
		name: "React",
		category: "Frontend",
		level: "実務対応",
		tags: ["TypeScript", "JavaScript"],
	},
	{
		name: "Astro",
		category: "Frontend",
		level: "実務対応",
		tags: ["TypeScript", "JavaScript"],
	},
	{
		name: "FastAPI",
		category: "Backend",
		level: "実務対応",
		tags: ["Python"],
	},
	{
		name: "Django",
		category: "Backend",
		level: "学習中",
		tags: ["Python"],
	},
	{
		name: "Hono",
		category: "Backend",
		level: "実務対応",
		tags: ["TypeScript"],
	},
	{
		name: "Cloudflare",
		category: "Platform",
		level: "実務対応",
		tags: ["Pages", "Workers", "D1", "Zero Trust", "DNS", "Edge"],
	},
	{
		name: "Electron",
		category: "Desktop",
		level: "実務対応",
		tags: ["TypeScript"],
	},
	{
		name: "Unity",
		category: "Game",
		level: "学習中",
		tags: ["C#"],
	},
	{
		name: ".NET",
		category: "DeskTop",
		level: "学習中",
		tags: ["C#"],
	},
	{
		name: "Aseprite",
		category: "Creative",
		level: "学習中",
		tags: ["Pixel Art", "Animation"],
	},
];
