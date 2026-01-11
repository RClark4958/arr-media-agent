import type { Env, Message, SessionData } from '../types';
import { SonarrClient } from '../clients/sonarr';
import { RadarrClient } from '../clients/radarr';
import { TautulliClient } from '../clients/tautulli';
import { OmbiClient } from '../clients/ombi';
import { tools, systemPrompt } from './tools';

export class PlexAgent {
	private capturedRecommendations: any[] = [];
	private capturedSearchResults: any[] = [];

	constructor(private env: Env, private session: SessionData) {}

	async chat(messages: Message[]): Promise<{
		response: string;
		recommendations?: any[];
		searchResults?: any[];
	}> {
		// Reset captured data
		this.capturedRecommendations = [];
		this.capturedSearchResults = [];
		// Add system prompt if not present
		if (!messages.some((m) => m.role === 'system')) {
			messages.unshift({
				role: 'system',
				content: systemPrompt,
			});
		}

		// Call Workers AI with function calling
		const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
			messages,
			tools,
		});

		// Check if there are tool calls
		if (response.tool_calls && response.tool_calls.length > 0) {
			const toolResults = await this.executeTools(response.tool_calls);

			// Add assistant message with tool call
			messages.push({
				role: 'assistant',
				content: response.response || 'Executing tools...',
			});

			// Add tool results as user message
			messages.push({
				role: 'user',
				content: `Tool results: ${JSON.stringify(toolResults)}`,
			});

			// Get final response from AI with tool results
			const finalResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages,
			});


			return {
				response: finalResponse.response || 'No response generated',
				recommendations: this.capturedRecommendations.length > 0 ? this.capturedRecommendations : undefined,
				searchResults: this.capturedSearchResults.length > 0 ? this.capturedSearchResults : undefined,
			};
		}

		return {
			response: response.response || 'No response generated',
			recommendations: this.capturedRecommendations.length > 0 ? this.capturedRecommendations : undefined,
			searchResults: this.capturedSearchResults.length > 0 ? this.capturedSearchResults : undefined,
		};
	}

	private async executeTools(toolCalls: any[]): Promise<Record<string, any>> {
		const results: Record<string, any> = {};

		for (const toolCall of toolCalls) {
			try {
				const result = await this.executeTool(toolCall.name, toolCall.arguments);
				results[toolCall.name] = result;
			} catch (error: any) {
				results[toolCall.name] = { error: error.message };
			}
		}

		return results;
	}

	private async executeTool(name: string, args: any): Promise<any> {
		const sonarr = new SonarrClient(this.env.SONARR_URL, this.env.SONARR_API_KEY);
		const radarr = new RadarrClient(this.env.RADARR_URL, this.env.RADARR_API_KEY);
		const tautulli = new TautulliClient(this.env.TAUTULLI_URL, this.env.TAUTULLI_API_KEY);
		const ombi = new OmbiClient(this.env.OMBI_URL, this.env.OMBI_API_KEY);

		switch (name) {
			case 'search_series':
				const seriesResults = await sonarr.searchSeries(args.title);
			this.capturedSearchResults = formattedSeriesResults;
			return formattedSeriesResults;
				return seriesResults.slice(0, 5).map((s) => ({
					title: s.title,
					tvdbId: s.tvdbId,
					year: s.year,
					overview: s.overview,
					status: s.status,
					network: s.network,
					posterUrl: s.images.find((img) => img.coverType === 'poster')?.url,
					bannerUrl: s.images.find((img) => img.coverType === 'banner')?.url,
				}));

			case 'add_series':
				// Get default quality profile and root folder from preferences or fetch first available
				let qualityProfileId = this.session.preferences?.qualityProfileId;
				let rootFolder = this.session.preferences?.rootFolder;

				if (!qualityProfileId || !rootFolder) {
					const [profiles, folders] = await Promise.all([
						sonarr.getQualityProfiles(),
						sonarr.getRootFolders(),
					]);

					if (!qualityProfileId) qualityProfileId = profiles[0]?.id;
					if (!rootFolder) rootFolder = folders[0]?.path;
				}

				if (!qualityProfileId || !rootFolder) {
					throw new Error('No quality profile or root folder configured');
				}

				const addedSeries = await sonarr.addSeries({
					tvdbId: args.tvdbId,
					title: args.title,
					qualityProfileId,
					rootFolderPath: rootFolder,
					seasonFolder: true,
					monitored: true,
					addOptions: {
						searchForMissingEpisodes: true,
					},
				});

				// Log request in D1
				await this.logMediaRequest('series', args.title, { tvdbId: args.tvdbId }, 'added');

				return {
					success: true,
					title: addedSeries.title,
					message: `${addedSeries.title} has been added and is now downloading`,
				};

			case 'search_movie':
				const movieResults = await radarr.searchMovies(args.title);
			this.capturedSearchResults = formattedMovieResults;
			return formattedMovieResults;
				return movieResults.slice(0, 5).map((m) => ({
					title: m.title,
					tmdbId: m.tmdbId,
					year: m.year,
					overview: m.overview,
					runtime: m.runtime,
					studio: m.studio,
					rating: m.ratings?.value,
					posterUrl: m.images.find((img) => img.coverType === 'poster')?.url,
					fanartUrl: m.images.find((img) => img.coverType === 'fanart')?.url,
				}));

			case 'add_movie':
				// Get default quality profile and root folder
				let movieQualityProfileId = this.session.preferences?.qualityProfileId;
				let movieRootFolder = this.session.preferences?.rootFolder;

				if (!movieQualityProfileId || !movieRootFolder) {
					const [profiles, folders] = await Promise.all([
						radarr.getQualityProfiles(),
						radarr.getRootFolders(),
					]);

					if (!movieQualityProfileId) movieQualityProfileId = profiles[0]?.id;
					if (!movieRootFolder) movieRootFolder = folders[0]?.path;
				}

				if (!movieQualityProfileId || !movieRootFolder) {
					throw new Error('No quality profile or root folder configured');
				}

				const addedMovie = await radarr.addMovie({
					tmdbId: args.tmdbId,
					title: args.title,
					year: args.year,
					qualityProfileId: movieQualityProfileId,
					rootFolderPath: movieRootFolder,
					monitored: true,
					addOptions: {
						searchForMovie: true,
					},
				});

				// Log request in D1
				await this.logMediaRequest('movie', args.title, { tmdbId: args.tmdbId, year: args.year }, 'added');

				return {
					success: true,
					title: addedMovie.title,
					message: `${addedMovie.title} (${args.year}) has been added and is now downloading`,
				};

			case 'get_recommendations':
				if (!this.session.tautulliUserId) {
					return { error: 'User not found in Tautulli' };
				}

				const recommendations = await tautulli.generateRecommendations(this.session.tautulliUserId);
			// Capture recommendations for frontend display
			this.capturedRecommendations = recommendations.recommendations;
			return {
				topGenres: recommendations.topGenres,
				recommendations: recommendations.recommendations,
			};

			case 'get_watch_history':
				if (!this.session.tautulliUserId) {
					return { error: 'User not found in Tautulli' };
				}

				const limit = args.limit || 10;
				const historyData = await tautulli.getUserHistory(this.session.tautulliUserId, limit);
				const history = historyData.data || [];

				return history.map((item) => ({
				title: item.media_type === 'episode' ? item.grandparent_title || item.title : item.title,
				episodeName: item.media_type === 'episode' ? item.title : undefined,
					type: item.media_type,
					year: item.year,
					watchedDate: new Date(item.stopped * 1000).toLocaleDateString(),
				}));

			case 'check_library':
				if (args.mediaType === 'series') {
					const seriesSearch = await sonarr.searchSeries(args.title);
					if (seriesSearch.length > 0) {
						const exists = await sonarr.checkSeriesExists(seriesSearch[0].tvdbId);
						return { exists, title: seriesSearch[0].title };
					}
					return { exists: false };
				} else {
					const movieSearch = await radarr.searchMovies(args.title);
					if (movieSearch.length > 0) {
						const exists = await radarr.checkMovieExists(movieSearch[0].tmdbId);
						return { exists, title: movieSearch[0].title };
					}
					return { exists: false };
				}

			default:
				return this.handleOmbiRequests(name, args);
		}
	}

	private async handleOmbiRequests(name: string, args: any): Promise<any> {
		const ombi = new OmbiClient(this.env.OMBI_URL, this.env.OMBI_API_KEY);

		switch (name) {
			case 'request_movie_ombi':
				// Get Ombi user ID for request attribution
				const ombiMovieUser = await ombi.getUserByUsername(this.session.username);

				const movieRequest = await ombi.requestMovie(args.tmdbId, ombiMovieUser?.id);

				// Log to D1
				await this.logMediaRequest('movie', args.title, { tmdbId: args.tmdbId }, 'added');

				return {
					success: true,
					title: args.title,
					message: `Request submitted for ${args.title}. It will need approval before being added.`,
					requestId: movieRequest.id,
				};

			case 'request_series_ombi':
				// Get Ombi user ID for request attribution
				const ombiSeriesUser = await ombi.getUserByUsername(this.session.username);

				const seriesRequest = await ombi.requestTvShow(args.tvdbId, ombiSeriesUser?.id, true);

				// Log to D1
				await this.logMediaRequest('series', args.title, { tvdbId: args.tvdbId }, 'added');

				return {
					success: true,
					title: args.title,
					message: `Request submitted for ${args.title}. It will need approval before being added.`,
					requestId: seriesRequest.id,
				};

			default:
				throw new Error(`Unknown tool: ${name}`);
		}
	}

	private async logMediaRequest(
		mediaType: 'movie' | 'series',
		title: string,
		ids: { tmdbId?: number; tvdbId?: number; year?: number },
		status: 'added' | 'failed' | 'exists'
	): Promise<void> {
		const requestId = crypto.randomUUID();
		await this.env.DB.prepare(
			`INSERT INTO media_requests (id, user_id, media_type, title, year, tmdb_id, tvdb_id, status, requested_at, completed_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
			.bind(
				requestId,
				this.session.userId,
				mediaType,
				title,
				ids.year || null,
				ids.tmdbId || null,
				ids.tvdbId || null,
				status,
				Date.now(),
				Date.now()
			)
			.run();
	}
}
