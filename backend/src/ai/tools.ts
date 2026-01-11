// AI Tool definitions for Workers AI function calling

export const tools = [
	{
		name: 'search_series',
		description:
			'Search for a TV series in Sonarr by title. Use this when the user wants to add a TV show.',
		parameters: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'The title of the TV series to search for',
				},
			},
			required: ['title'],
		},
	},
	{
		name: 'add_series',
		description:
			'Add a TV series to Sonarr for download. Requires tvdbId from search_series results.',
		parameters: {
			type: 'object',
			properties: {
				tvdbId: {
					type: 'number',
					description: 'The TVDB ID of the series',
				},
				title: {
					type: 'string',
					description: 'The title of the series',
				},
			},
			required: ['tvdbId', 'title'],
		},
	},
	{
		name: 'search_movie',
		description: 'Search for a movie in Radarr by title. Use this when the user wants to add a movie.',
		parameters: {
			type: 'object',
			properties: {
				title: {
					type: 'string',
					description: 'The title of the movie to search for',
				},
			},
			required: ['title'],
		},
	},
	{
		name: 'add_movie',
		description: 'Add a movie to Radarr for download. Requires tmdbId from search_movie results.',
		parameters: {
			type: 'object',
			properties: {
				tmdbId: {
					type: 'number',
					description: 'The TMDB ID of the movie',
				},
				title: {
					type: 'string',
					description: 'The title of the movie',
				},
				year: {
					type: 'number',
					description: 'The release year of the movie',
				},
			},
			required: ['tmdbId', 'title', 'year'],
		},
	},
	{
		name: 'get_recommendations',
		description:
			'Get personalized content recommendations based on the user\'s Plex watch history via Tautulli',
		parameters: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	{
		name: 'get_watch_history',
		description: 'Get the user\'s recent watch history from Plex via Tautulli',
		parameters: {
			type: 'object',
			properties: {
				limit: {
					type: 'number',
					description: 'Number of items to return (default: 10)',
				},
			},
			required: [],
		},
	},
	{
		name: 'check_library',
		description: 'Check if a movie or TV series already exists in the Plex library',
		parameters: {
			type: 'object',
			properties: {
				mediaType: {
					type: 'string',
					enum: ['movie', 'series'],
					description: 'Type of media to check',
				},
				title: {
					type: 'string',
					description: 'Title to search for',
				},
			},
			required: ['mediaType', 'title'],
		},
	},
	{
		name: 'request_movie_ombi',
		description:
			'Request a movie through Ombi (requires approval). Use this for a request/approval workflow instead of adding directly.',
		parameters: {
			type: 'object',
			properties: {
				tmdbId: {
					type: 'number',
					description: 'The TMDB ID of the movie',
				},
				title: {
					type: 'string',
					description: 'The title of the movie',
				},
			},
			required: ['tmdbId', 'title'],
		},
	},
	{
		name: 'request_series_ombi',
		description:
			'Request a TV series through Ombi (requires approval). Use this for a request/approval workflow instead of adding directly.',
		parameters: {
			type: 'object',
			properties: {
				tvdbId: {
					type: 'number',
					description: 'The TVDB ID of the series',
				},
				title: {
					type: 'string',
					description: 'The title of the series',
				},
			},
			required: ['tvdbId', 'title'],
		},
	},
];

export const systemPrompt = `You are Ralf, the AI assistant for Rickyflix - a Plex media library. Your name comes from the letters RLF in Rickyflix. You can help users:

1. Search for and add TV shows using Sonarr OR request through Ombi
2. Search for and add movies using Radarr OR request through Ombi
3. Get personalized recommendations based on their watch history from Tautulli
4. Check if content already exists in their library

When users ask to add content, you have TWO OPTIONS:
- **Direct Add**: Use add_series or add_movie to add directly to Sonarr/Radarr (immediate download)
- **Request via Ombi**: Use request_series_ombi or request_movie_ombi to submit a request (requires approval)

Default to OMBI requests since they track who requested what and support approval workflows. Only use direct add if the user explicitly asks to "add now" or "download immediately".

When adding/requesting content:
- First search for it using the appropriate tool (search_series or search_movie)
- Present the search results to the user if multiple matches are found
- When adding content, always confirm the correct match with the user first
- After requesting via Ombi, let them know their request has been submitted for approval
- After adding directly, let them know it's been queued for download

When providing recommendations:
- Use get_recommendations to fetch personalized suggestions based on their viewing patterns
- Explain why you're recommending something based on their watch history

Be conversational, friendly, and helpful. If a user asks about content, check if it exists first before searching to add it.`;
