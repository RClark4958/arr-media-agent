import { DurableObjectNamespace } from 'cloudflare:workers';

// Environment bindings
export interface Env {
	AI: Ai;
	DB: D1Database;
	SESSIONS: KVNamespace;
	CONVERSATIONS: DurableObjectNamespace;

	// Environment variables
	PLEX_CLIENT_ID: string;

	// Secrets (set via wrangler secret)
	SONARR_URL: string;
	SONARR_API_KEY: string;
	RADARR_URL: string;
	RADARR_API_KEY: string;
	TAUTULLI_URL: string;
	TAUTULLI_API_KEY: string;
	OMBI_URL: string;
	OMBI_API_KEY: string;
}

// Session types
export interface SessionData {
	userId: string;
	plexToken: string;
	plexUserId: string;
	username: string;
	email?: string;
	tautulliUserId?: number;
	preferences?: UserPreferences;
	createdAt: number;
	lastAccess: number;
}

export interface UserPreferences {
	qualityProfileId?: number;
	rootFolder?: string;
	autoSearch?: boolean;
}

// Plex OAuth types
export interface PlexPin {
	id: number;
	code: string;
}

export interface PlexUser {
	id: number;
	uuid: string;
	username: string;
	email: string;
	title: string;
	thumb: string;
	authToken?: string;
}

// Sonarr types
export interface SonarrSeries {
	title: string;
	tvdbId: number;
	imdbId?: string;
	year: number;
	overview: string;
	network?: string;
	status: string;
	images: Array<{ coverType: string; url: string }>;
	seasons: Array<{ seasonNumber: number; monitored: boolean }>;
}

export interface SonarrQualityProfile {
	id: number;
	name: string;
}

export interface SonarrRootFolder {
	path: string;
	freeSpace: number;
	id: number;
}

export interface SonarrAddSeriesRequest {
	tvdbId: number;
	title: string;
	qualityProfileId: number;
	rootFolderPath: string;
	seasonFolder?: boolean;
	monitored?: boolean;
	addOptions?: {
		searchForMissingEpisodes?: boolean;
	};
}

// Radarr types
export interface RadarrMovie {
	title: string;
	tmdbId: number;
	imdbId?: string;
	year: number;
	overview: string;
	studio?: string;
	runtime: number;
	images: Array<{ coverType: string; url: string }>;
	ratings?: { value: number };
}

export interface RadarrQualityProfile {
	id: number;
	name: string;
}

export interface RadarrRootFolder {
	path: string;
	freeSpace: number;
	id: number;
}

export interface RadarrAddMovieRequest {
	tmdbId: number;
	title: string;
	year: number;
	qualityProfileId: number;
	rootFolderPath: string;
	monitored?: boolean;
	addOptions?: {
		searchForMovie?: boolean;
	};
}

// Tautulli types
export interface TautulliHistoryItem {
	media_type: 'movie' | 'episode';
	title: string;
	year: number;
	rating_key: number;
	grandparent_title?: string; // For TV shows
	parent_title?: string; // Season
	watched_status: number;
	percent_complete: number;
	stopped: number;
}

export interface TautulliUser {
	user_id: number;
	username: string;
	email: string;
	thumb: string;
}

export interface TautulliMetadata {
	title: string;
	year: number;
	rating_key: number;
	media_type: string;
	genres: string[];
	directors: string[];
	actors: string[];
	rating: number;
	summary: string;
	thumb?: string;
	art?: string;
	banner?: string;
}

// AI Tool types
export interface ToolCall {
	name: string;
	arguments: Record<string, unknown>;
}

export interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

// Media request tracking
export interface MediaRequest {
	id: string;
	userId: string;
	mediaType: 'movie' | 'series';
	title: string;
	year?: number;
	tmdbId?: number;
	tvdbId?: number;
	imdbId?: string;
	status: 'pending' | 'added' | 'failed' | 'exists';
	requestedAt: number;
	completedAt?: number;
	errorMessage?: string;
}

// Ombi types
export interface OmbiSearchResult {
	id: number;
	title: string;
	releaseDate?: string;
	year?: number;
	overview: string;
	posterPath?: string;
	mediaType: 'movie' | 'tv';
	available: boolean;
	requested: boolean;
	approved: boolean;
}

export interface OmbiRequestResponse {
	id: number;
	mediaId: number;
	requestedUserId: string;
	requestedDate: string;
	approved: boolean;
	denied: boolean;
	available: boolean;
}

export interface OmbiUser {
	id: string;
	userName: string;
	email: string;
	userType: number;
}
