import type { PlexPin, PlexUser, Env, SessionData } from '../types';
import { TautulliClient } from '../clients/tautulli';

const PLEX_API_BASE = 'https://plex.tv/api/v2';
const PLEX_PRODUCT = 'Ralf for Rickyflix';
const PLEX_VERSION = '1.0.0';
const PLEX_PLATFORM = 'Web';

export class PlexAuth {
	private clientId: string;

	constructor(clientId: string) {
		this.clientId = clientId;
	}

	private getHeaders(): Record<string, string> {
		return {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Plex-Product': PLEX_PRODUCT,
			'X-Plex-Version': PLEX_VERSION,
			'X-Plex-Client-Identifier': this.clientId,
			'X-Plex-Platform': PLEX_PLATFORM,
			'X-Plex-Platform-Version': '1.0',
			'X-Plex-Device': 'Browser',
			'X-Plex-Device-Name': 'Ralf - Rickyflix AI',
		};
	}

	async requestPin(): Promise<PlexPin> {
		const response = await fetch(`${PLEX_API_BASE}/pins`, {
			method: 'POST',
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Failed to request PIN:', response.status, errorText);
			throw new Error(`Failed to request PIN: ${response.statusText}`);
		}

		const data = await response.json();
		console.log('PIN created:', data.id, 'Code:', data.code);
		return {
			id: data.id,
			code: data.code,
		};
	}

	async checkPin(pinId: number): Promise<string | null> {
		const response = await fetch(`${PLEX_API_BASE}/pins/${pinId}`, {
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			console.error(`Failed to check PIN: ${response.status} ${response.statusText}`);
			throw new Error(`Failed to check PIN: ${response.statusText}`);
		}

		const data = await response.json();
		console.log('PIN check response:', JSON.stringify(data));

		// Plex API v2 returns authToken in the response
		// Check both authToken and auth_token for compatibility
		return data.authToken || data.auth_token || null;
	}

	async pollForToken(pinId: number, maxAttempts: number = 60): Promise<string> {
		for (let i = 0; i < maxAttempts; i++) {
			const token = await this.checkPin(pinId);
			if (token) {
				return token;
			}
			// Wait 2 seconds between attempts
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
		throw new Error('Authentication timeout - user did not authorize');
	}

	async getUserInfo(authToken: string): Promise<PlexUser> {
		const response = await fetch(`${PLEX_API_BASE}/user`, {
			headers: {
				...this.getHeaders(),
				'X-Plex-Token': authToken,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to get user info: ${response.statusText}`);
		}

		return response.json();
	}

	async createSession(
		env: Env,
		plexUser: PlexUser,
		plexToken: string
	): Promise<{ sessionId: string; sessionData: SessionData }> {
		// Validate user exists in Tautulli (which means they have access to the Plex server)
		let tautulliUserId: number;
		try {
			const tautulli = new TautulliClient(env.TAUTULLI_URL, env.TAUTULLI_API_KEY);
			const tautulliUser = await tautulli.getUserByUsername(plexUser.username);

			if (!tautulliUser) {
				throw new Error('User not authorized. You must have access to this Plex server.');
			}

			tautulliUserId = tautulliUser.user_id;
		} catch (error) {
			if (error instanceof Error && error.message.includes('not authorized')) {
				throw error;
			}
			console.error('Error fetching Tautulli user:', error);
			throw new Error('Failed to validate user access. Please try again later.');
		}

		// Create or update user in D1
		const userId = plexUser.uuid;
		await env.DB.prepare(
			`INSERT INTO users (id, plex_user_id, username, email, tautulli_user_id, created_at, last_login)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(id) DO UPDATE SET
			   username = excluded.username,
			   email = excluded.email,
			   tautulli_user_id = excluded.tautulli_user_id,
			   last_login = excluded.last_login`
		)
			.bind(
				userId,
				String(plexUser.id),
				plexUser.username,
				plexUser.email || null,
				tautulliUserId,
				Date.now(),
				Date.now()
			)
			.run();

		// Get user preferences from D1
		const prefsResult = await env.DB.prepare('SELECT * FROM user_preferences WHERE user_id = ?')
			.bind(userId)
			.first();

		const sessionData: SessionData = {
			userId,
			plexToken,
			plexUserId: String(plexUser.id),
			username: plexUser.username,
			email: plexUser.email,
			tautulliUserId,
			preferences: prefsResult
				? {
						qualityProfileId: prefsResult.default_quality_profile_id as number,
						rootFolder: prefsResult.default_root_folder as string,
						autoSearch: Boolean(prefsResult.auto_search),
				  }
				: undefined,
			createdAt: Date.now(),
			lastAccess: Date.now(),
		};

		// Store session in KV
		const sessionId = crypto.randomUUID();
		await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(sessionData), {
			expirationTtl: 86400 * 30, // 30 days
		});

		return { sessionId, sessionData };
	}

	async getSession(env: Env, sessionId: string): Promise<SessionData | null> {
		const data = await env.SESSIONS.get(`session:${sessionId}`, 'json');
		return data as SessionData | null;
	}

	async updateSessionAccess(env: Env, sessionId: string): Promise<void> {
		const session = await this.getSession(env, sessionId);
		if (!session) return;

		session.lastAccess = Date.now();
		await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
			expirationTtl: 86400 * 30,
		});
	}
}
