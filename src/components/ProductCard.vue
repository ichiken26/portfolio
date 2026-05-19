<script setup lang="ts">
interface ProductEntry {
	id: string;
	data: {
		title: string;
		type: string;
		status: string;
		summary: string;
		stack: string[];
		imagePath: string;
	};
}

const { product } = defineProps<{
	product: ProductEntry;
}>();

const productPath = `/products/${product.id}/`;
</script>

<template>
	<article class="product-card">
		<div class="card-content">
			<div class="pixel-preview" aria-hidden="true">
				<img :src="product.data.imagePath" :alt="product.data.title" loading="lazy" decoding="async" />
			</div>
			<div class="product-meta">
				<span>{{ product.data.type }}</span>
				<strong>{{ product.data.status }}</strong>
			</div>
			<h2>
				<a class="title-link" :href="productPath" :aria-label="`${product.data.title} の詳細を見る`">
					{{ product.data.title }}
				</a>
			</h2>
			<p>{{ product.data.summary }}</p>
			<ul :aria-label="`${product.data.title} stack`">
				<li v-for="item in product.data.stack" :key="item">
					<a class="chip-link" :href="productPath">{{ item }}</a>
				</li>
			</ul>
		</div>
	</article>
</template>

<style scoped>
.product-card {
	border: 1px solid var(--line);
	border-radius: 8px;
	background: var(--surface);
	box-shadow: var(--shadow);
	transition:
		transform 160ms ease,
		box-shadow 160ms ease;
}

.product-card:hover {
	transform: translateY(-3px);
	box-shadow: 0 24px 60px rgba(27, 42, 38, 0.14);
}

.card-content {
	display: grid;
	min-height: 360px;
	grid-template-rows: 128px auto auto 1fr auto;
	gap: 16px;
	padding: 18px;
	color: inherit;
	text-decoration: none;
}

.pixel-preview {
	position: relative;
	overflow: hidden;
	border: 2px solid var(--ink);
	border-radius: 6px;
	background: var(--surface-muted);
	box-shadow: 5px 5px 0 var(--ink);
	min-height: 128px;
}

.pixel-preview img {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.product-meta {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	color: var(--muted);
	font-size: 13px;
	font-weight: 800;
}

.product-meta strong {
	color: var(--accent-strong);
}

.product-card h2 {
	margin: 0;
	font-size: 25px;
	letter-spacing: 0;
}

.product-card p {
	margin: 0;
	color: var(--muted);
	line-height: 1.75;
}

.product-card ul {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.product-card li {
	display: inline-flex;
	align-items: stretch;
	font-size: 12px;
	font-weight: 800;
	border-radius: 999px;
	background: var(--surface-muted);
	overflow: hidden;
}

.title-link {
	color: inherit;
	text-decoration: none;
}

.title-link:hover {
	text-decoration: underline;
	text-underline-offset: 2px;
}

.chip-link {
	display: flex;
	align-items: center;
	width: 100%;
	padding: 6px 10px;
	color: inherit;
	text-decoration: none;
	cursor: pointer;
	pointer-events: auto;
}

.chip-link:hover {
	background: var(--line);
}
</style>
