import type { OmbiSearchResult, OmbiRequestResponse, OmbiUser } from '../types';

export class OmbiClient {
	private baseUrl: string;
	private apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.apiKey = apiKey;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}/api/v1${endpoint}`;
		const response = await fetch(url, {
			...options,
			headers: {
				ApiKey: this.apiKey,
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Ombi API error: ${response.status} - ${error}`);
		}

		return response.json();
	}

	async searchMovies(query: string): Promise<OmbiSearchResult[]> {
		const results = await this.request<any[]>(`/Search/movie/${encodeURIComponent(query)}`);
		return results.map((item) => ({
			id: item.theMovieDbId || item.id,
			title: item.title,
			releaseDate: item.releaseDate,
			year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
			overview: item.overview || '',
			posterPath: item.posterPath,
			mediaType: 'movie' as const,
			available: item.available || false,
			requested: item.requested || false,
			approved: item.approved || false,
		}));
	}

	async searchTvShows(query: string): Promise<OmbiSearchResult[]> {
		const results = await this.request<any[]>(`/Search/tv/${encodeURIComponent(query)}`);
		return results.map((item) => ({
			id: item.id,
			title: item.title || item.name,
			releaseDate: item.firstAired,
			year: item.firstAired ? new Date(item.firstAired).getFullYear() : undefined,
			overview: item.overview || '',
			posterPath: item.banner,
			mediaType: 'tv' as const,
			available: item.available || false,
			requested: item.requested || false,
			approved: item.approved || false,
		}));
	}

	async requestMovie(tmdbId: number, userId?: string): Promise<OmbiRequestResponse> {
		return this.request<OmbiRequestResponse>('/Request/movie', {
			method: 'POST',
			body: JSON.stringify({
				theMovieDbId: tmdbId,
				languageCode: 'en',
				requestedUserId: userId,
			}),
		});
	}

	async requestTvShow(tvdbId: number, userId?: string, requestAll: boolean = true): Promise<OmbiRequestResponse> {
		return this.request<OmbiRequestResponse>('/Request/tv', {
			method: 'POST',
			body: JSON.stringify({
				tvDbId: tvdbId,
				languageCode: 'en',
				requestAll,
				latestSeason: !requestAll,
				requestedUserId: userId,
			}),
		});
	}

	async getUserRequests(userId?: string): Promise<any[]> {
		const endpoint = userId ? `/Request/user/${userId}` : '/Request';
		return this.request<any[]>(endpoint);
	}

	async getUsers(): Promise<OmbiUser[]> {
		return this.request<OmbiUser[]>('/Identity/Users');
	}

	async getUserByUsername(username: string): Promise<OmbiUser | null> {
		try {
			const users = await this.getUsers();
			return users.find((u) => u.userName.toLowerCase() === username.toLowerCase()) || null;
		} catch (error) {
			console.error('Error fetching Ombi users:', error);
			return null;
		}
	}

	async checkMovieRequested(tmdbId: number): Promise<boolean> {
		try {
			const result = await this.searchMovies(String(tmdbId));
			return result.some((m) => m.id === tmdbId && (m.requested || m.available));
		} catch (error) {
			console.error('Error checking if movie is requested:', error);
			return false;
		}
	}

	async checkTvShowRequested(tvdbId: number): Promise<boolean> {
		try {
			// Ombi uses TV database ID for TV shows
			const requests = await this.getUserRequests();
			return requests.some((r) => r.tvDbId === tvdbId || r.id === tvdbId);
		} catch (error) {
			console.error('Error checking if TV show is requested:', error);
			return false;
		}
	}
}
