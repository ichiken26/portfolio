import type { TechStack } from "../data/portfolio";
import "./TechStackCard.css";

interface Props {
	tech: TechStack;
}

export default function TechStackCard({ tech }: Props) {
	return (
		<article className="tech-card">
			<div className="card-top">
				<span>{tech.category}</span>
			</div>
			<h2>{tech.name}</h2>
			<strong className="tech-level">{tech.level}</strong>
			<ul aria-label={`${tech.name} tags`}>
				{tech.tags.map((tag) => (
					<li key={tag}>{tag}</li>
				))}
			</ul>
		</article>
	);
}
