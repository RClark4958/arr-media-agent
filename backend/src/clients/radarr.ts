import type {
	RadarrMovie,
	RadarrQualityProfile,
	RadarrRootFolder,
	RadarrAddMovieRequest,
} from '../types';

export class RadarrClient {
	private baseUrl: string;
	private apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.apiKey = apiKey;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}/api/v3${endpoint}`;
		const response = await fetch(url, {
			...options,
			headers: {
				'X-Api-Key': this.apiKey,
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Radarr API error: ${response.status} - ${error}`);
		}

		return response.json();
	}

	async searchMovies(query: string): Promise<RadarrMovie[]> {
		return this.request<RadarrMovie[]>(`/movie/lookup?term=${encodeURIComponent(query)}`);
	}

	async getQualityProfiles(): Promise<RadarrQualityProfile[]> {
		return this.request<RadarrQualityProfile[]>('/qualityprofile');
	}

	async getRootFolders(): Promise<RadarrRootFolder[]> {
		return this.request<RadarrRootFolder[]>('/rootfolder');
	}

	async getExistingMovies(): Promise<RadarrMovie[]> {
		return this.request<RadarrMovie[]>('/movie');
	}

	async addMovie(data: RadarrAddMovieRequest): Promise<RadarrMovie> {
		// Check if movie already exists
		const existing = await this.getExistingMovies();
		const alreadyExists = existing.find((m) => m.tmdbId === data.tmdbId);

		if (alreadyExists) {
			throw new Error(`Movie "${data.title}" (${data.year}) already exists in Radarr`);
		}

		return this.request<RadarrMovie>('/movie', {
			method: 'POST',
			body: JSON.stringify({
				tmdbId: data.tmdbId,
				title: data.title,
				year: data.year,
				qualityProfileId: data.qualityProfileId,
				rootFolderPath: data.rootFolderPath,
				monitored: data.monitored ?? true,
				addOptions: data.addOptions ?? {
					searchForMovie: true,
				},
			}),
		});
	}

	async checkMovieExists(tmdbId: number): Promise<boolean> {
		try {
			const existing = await this.getExistingMovies();
			return existing.some((m) => m.tmdbId === tmdbId);
		} catch (error) {
			console.error('Error checking if movie exists:', error);
			return false;
		}
	}
}
