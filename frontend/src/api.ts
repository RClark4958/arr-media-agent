import type { Message, ChatResponse, AuthResponse, AuthCheckResponse } from './types';

// Set VITE_API_URL in .env.local to point to your deployed Worker
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export class PlexAgentAPI {
	private sessionId: string | null = null;

	constructor() {
		// Load session from localStorage
		this.sessionId = localStorage.getItem('plex_session_id');
	}

	async startAuth(): Promise<AuthResponse> {
		const response = await fetch(`${API_URL}/auth/start`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error('Failed to start authentication');
		}

		return response.json();
	}

	async checkAuth(pin: string): Promise<AuthCheckResponse> {
		const response = await fetch(`${API_URL}/auth/check`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ pin }),
		});

		const data = await response.json();

		// Handle authorization error (403 - user not in Tautulli)
		if (response.status === 403) {
			throw new Error(data.error || 'You do not have access to this Plex server');
		}

		if (!response.ok) {
			throw new Error('Failed to check authentication');
		}

		if (data.authenticated && data.sessionId) {
			this.sessionId = data.sessionId;
			localStorage.setItem('plex_session_id', data.sessionId);
		}

		return data;
	}

	async completeAuth(authToken: string): Promise<AuthCheckResponse> {
		const response = await fetch(`${API_URL}/auth/complete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ authToken }),
		});

		const data = await response.json();

		// Handle authorization error (403 - user not in Tautulli)
		if (response.status === 403) {
			throw new Error(data.error || 'You do not have access to this Plex server');
		}

		if (!response.ok) {
			throw new Error('Failed to complete authentication');
		}

		if (data.authenticated && data.sessionId) {
			this.sessionId = data.sessionId;
			localStorage.setItem('plex_session_id', data.sessionId);
		}

		return data;
	}

	async sendMessage(message: string): Promise<ChatResponse> {
		if (!this.sessionId) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(`${API_URL}/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Session-ID': this.sessionId,
			},
			body: JSON.stringify({ message }),
		});

		if (!response.ok) {
			if (response.status === 401) {
				this.logout();
				throw new Error('Session expired');
			}
			throw new Error('Failed to send message');
		}

		return response.json();
	}

	async getHistory(): Promise<Message[]> {
		if (!this.sessionId) {
			throw new Error('Not authenticated');
		}

		const response = await fetch(`${API_URL}/history`, {
			headers: {
				'X-Session-ID': this.sessionId,
			},
		});

		if (!response.ok) {
			if (response.status === 401) {
				this.logout();
				throw new Error('Session expired');
			}
			throw new Error('Failed to fetch history');
		}

		const data = await response.json();
		return data.messages || [];
	}

	isAuthenticated(): boolean {
		return this.sessionId !== null;
	}

	logout(): void {
		this.sessionId = null;
		localStorage.removeItem('plex_session_id');
	}
}

export const api = new PlexAgentAPI();
