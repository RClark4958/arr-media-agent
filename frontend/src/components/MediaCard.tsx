import type { Recommendation } from '../types';
import './MediaCard.css';

interface MediaCardProps {
	media: Recommendation;
	onRequest?: (media: Recommendation) => void;
}

export function MediaCard({ media, onRequest }: MediaCardProps) {
	return (
		<div className="media-card">
			{media.thumb && (
				<div className="media-card-image">
					<img src={media.thumb} alt={media.title} loading="lazy" />
				</div>
			)}
			<div className="media-card-content">
				<h3 className="media-card-title">{media.title}</h3>
				{media.year && <p className="media-card-year">{media.year}</p>}
				{media.rating && (
					<div className="media-card-rating">
						⭐ {media.rating.toFixed(1)}
					</div>
				)}
				{media.genres && media.genres.length > 0 && (
					<div className="media-card-genres">
						{media.genres.slice(0, 3).map((genre, index) => (
							<span key={index} className="genre-tag">
								{genre}
							</span>
						))}
					</div>
				)}
				{media.summary && (
					<p className="media-card-summary">
						{media.summary.length > 150
							? `${media.summary.substring(0, 150)}...`
							: media.summary}
					</p>
				)}
				{onRequest && (
					<button className="media-card-button" onClick={() => onRequest(media)}>
						Request
					</button>
				)}
			</div>
		</div>
	);
}
