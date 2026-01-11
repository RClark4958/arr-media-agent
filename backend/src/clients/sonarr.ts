import type {
	SonarrSeries,
	SonarrQualityProfile,
	SonarrRootFolder,
	SonarrAddSeriesRequest,
} from '../types';

export class SonarrClient {
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
			throw new Error(`Sonarr API error: ${response.status} - ${error}`);
		}

		return response.json();
	}

	async searchSeries(query: string): Promise<SonarrSeries[]> {
		return this.request<SonarrSeries[]>(`/series/lookup?term=${encodeURIComponent(query)}`);
	}

	async getQualityProfiles(): Promise<SonarrQualityProfile[]> {
		return this.request<SonarrQualityProfile[]>('/qualityprofile');
	}

	async getRootFolders(): Promise<SonarrRootFolder[]> {
		return this.request<SonarrRootFolder[]>('/rootfolder');
	}

	async getExistingSeries(): Promise<SonarrSeries[]> {
		return this.request<SonarrSeries[]>('/series');
	}

	async addSeries(data: SonarrAddSeriesRequest): Promise<SonarrSeries> {
		// Check if series already exists
		const existing = await this.getExistingSeries();
		const alreadyExists = existing.find((s) => s.tvdbId === data.tvdbId);

		if (alreadyExists) {
			throw new Error(`Series "${data.title}" already exists in Sonarr`);
		}

		return this.request<SonarrSeries>('/series', {
			method: 'POST',
			body: JSON.stringify({
				tvdbId: data.tvdbId,
				title: data.title,
				qualityProfileId: data.qualityProfileId,
				rootFolderPath: data.rootFolderPath,
				seasonFolder: data.seasonFolder ?? true,
				monitored: data.monitored ?? true,
				addOptions: data.addOptions ?? {
					searchForMissingEpisodes: true,
				},
			}),
		});
	}

	async checkSeriesExists(tvdbId: number): Promise<boolean> {
		try {
			const existing = await this.getExistingSeries();
			return existing.some((s) => s.tvdbId === tvdbId);
		} catch (error) {
			console.error('Error checking if series exists:', error);
			return false;
		}
	}
}
