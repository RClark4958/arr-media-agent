// Shared types between frontend and backend

export interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

export interface ChatResponse {
	response: string;
	conversationId?: string;
	recommendations?: Recommendation[];
	searchResults?: SearchResult[];
}

export interface AuthResponse {
	pin: string;
	code: string;
	authUrl: string;
}

export interface AuthCheckResponse {
	authenticated: boolean;
	sessionId?: string;
	user?: {
		username: string;
		email?: string;
	};
}

export interface SearchResult {
	title: string;
	year?: number;
	overview: string;
	posterUrl?: string;
	bannerUrl?: string;
	fanartUrl?: string;
	network?: string;
	studio?: string;
	rating?: number;
	runtime?: number;
	status?: string;
}

export interface Recommendation {
	title: string;
	year: number;
	mediaType: string;
	summary: string;
	genres: string[];
	rating: number;
	thumb?: string;
}
