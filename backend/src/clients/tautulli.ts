import type { TautulliHistoryItem, TautulliUser, TautulliMetadata } from '../types';

export class TautulliClient {
	private baseUrl: string;
	private apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.apiKey = apiKey;
	}

	private buildUrl(cmd: string, params: Record<string, string | number> = {}): string {
		const url = new URL(`${this.baseUrl}/api/v2`);
		url.searchParams.set('apikey', this.apiKey);
		url.searchParams.set('cmd', cmd);

		Object.entries(params).forEach(([key, value]) => {
			url.searchParams.set(key, String(value));
		});

		return url.toString();
	}

	private async request<T>(cmd: string, params: Record<string, string | number> = {}): Promise<T> {
		const url = this.buildUrl(cmd, params);
		const response = await fetch(url);

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Tautulli API error: ${response.status} - ${error}`);
		}

		const data = await response.json();

		if (data.response.result !== 'success') {
			throw new Error(`Tautulli error: ${data.response.message || 'Unknown error'}`);
		}

		return data.response.data;
	}

	async getUserList(): Promise<TautulliUser[]> {
		return this.request<TautulliUser[]>('get_users');
	}

	async getUserByUsername(username: string): Promise<TautulliUser | null> {
		const users = await this.getUserList();
		return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
	}

	async getUserHistory(userId: number, length: number = 25): Promise<{ data: TautulliHistoryItem[] }> {
		const result = await this.request<{ data: TautulliHistoryItem[] }>('get_history', {
			user_id: userId,
			length,
		});
		return result;
	}

	async getUserWatchStats(userId: number): Promise<{
		total_time: number;
		total_plays: number;
	}> {
		return this.request('get_user_watch_time_stats', {
			user_id: userId,
		});
	}

	async getMetadata(ratingKey: number): Promise<TautulliMetadata> {
		return this.request<TautulliMetadata>('get_metadata', {
			rating_key: ratingKey,
		});
	}

	async getRecentlyAdded(count: number = 10): Promise<{ recently_added: TautulliMetadata[] }> {
		return this.request<{ recently_added: TautulliMetadata[] }>('get_recently_added', {
			count,
		});
	}

	async generateRecommendations(userId: number): Promise<{
		topGenres: string[];
		recommendations: Array<{
			title: string;
			year: number;
			mediaType: string;
			summary: string;
			genres: string[];
			rating: number;
			thumb?: string;
		}>;
	}> {
		// Get user's watch history
		const historyData = await this.getUserHistory(userId, 50);
		const history = historyData.data || [];

		// Analyze genres from watched content
		const genreCounts = new Map<string, number>();

		for (const item of history) {
			try {
				const metadata = await this.getMetadata(item.rating_key);
				if (metadata.genres) {
					metadata.genres.forEach((genre) => {
						genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
					});
				}
			} catch (error) {
				console.error(`Error fetching metadata for rating_key ${item.rating_key}:`, error);
			}
		}

		// Sort genres by frequency
		const topGenres = Array.from(genreCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map((entry) => entry[0]);

		// Get recently added content
		const recentlyAddedData = await this.getRecentlyAdded(20);
		const recentlyAdded = recentlyAddedData.recently_added || [];

		// Filter recently added by user's top genres
		const recommendations = recentlyAdded
			.filter((item) => {
				if (!item.genres) return false;
				return item.genres.some((genre) => topGenres.includes(genre));
			})
			.slice(0, 5)
			.map((item) => ({
				title: item.title,
				year: item.year,
				mediaType: item.media_type,
				summary: item.summary,
				genres: item.genres,
				rating: item.rating,
				thumb: item.thumb,
			}));

		return {
			topGenres,
			recommendations,
		};
	}
}
