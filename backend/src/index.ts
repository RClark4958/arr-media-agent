import { PlexAuth } from './auth/plex';
import { PlexAgent } from './ai/agent';
import type { Env, Message } from './types';
import { ConversationDO } from './conversation-do';

// Export the Durable Object
export { ConversationDO };

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const plexAuth = new PlexAuth(env.PLEX_CLIENT_ID);

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// Authentication endpoints
			if (url.pathname === '/auth/start' && request.method === 'POST') {
				const pinData = await plexAuth.requestPin();
				// Use the official Plex auth URL format that matches their documentation
				const authUrl = `https://app.plex.tv/auth/#!?clientID=${env.PLEX_CLIENT_ID}&code=${pinData.code}`;

				console.log('Generated PIN:', pinData.id, 'Code:', pinData.code);

				return Response.json(
					{
						pin: pinData.id.toString(),
						code: pinData.code,
						authUrl,
					},
					{ headers: corsHeaders }
				);
			}

			if (url.pathname === '/auth/check' && request.method === 'POST') {
				const { pin } = await request.json<{ pin: string }>();
				const pinId = parseInt(pin);

				console.log('Checking PIN:', pinId);

				// Check if PIN is authorized (single check, not polling)
				const token = await plexAuth.checkPin(pinId);

				console.log('Token received:', token ? 'YES' : 'NO');

				if (token) {
					try {
						const user = await plexAuth.getUserInfo(token);
						console.log('User info retrieved:', user.username);

						const { sessionId, sessionData } = await plexAuth.createSession(env, user, token);
						console.log('Session created for user:', sessionData.username);

						return Response.json(
							{
								authenticated: true,
								sessionId,
								user: {
									username: sessionData.username,
									email: sessionData.email,
								},
							},
							{ headers: corsHeaders }
						);
					} catch (error) {
						// User authenticated with Plex but not authorized for this server
						console.error('Session creation error:', error);
						if (error instanceof Error && error.message.includes('not authorized')) {
							return Response.json(
								{
									authenticated: false,
									error: error.message,
								},
								{ status: 403, headers: corsHeaders }
							);
						}
						throw error; // Re-throw other errors to be caught by outer catch
					}
				}

				console.log('No token found for PIN:', pinId);
				return Response.json({ authenticated: false }, { headers: corsHeaders });
			}

			if (url.pathname === '/auth/complete' && request.method === 'POST') {
				const { authToken } = await request.json<{ authToken: string }>();

				console.log('Completing auth with direct token');

				try {
					const user = await plexAuth.getUserInfo(authToken);
					console.log('User info retrieved:', user.username);

					const { sessionId, sessionData } = await plexAuth.createSession(env, user, authToken);
					console.log('Session created for user:', sessionData.username);

					return Response.json(
						{
							authenticated: true,
							sessionId,
							user: {
								username: sessionData.username,
								email: sessionData.email,
							},
						},
						{ headers: corsHeaders }
					);
				} catch (error) {
					// User authenticated with Plex but not authorized for this server
					console.error('Session creation error:', error);
					if (error instanceof Error && error.message.includes('not authorized')) {
						return Response.json(
							{
								authenticated: false,
								error: error.message,
							},
							{ status: 403, headers: corsHeaders }
						);
					}
					throw error; // Re-throw other errors to be caught by outer catch
				}
			}

			// Chat endpoint
			if (url.pathname === '/chat' && request.method === 'POST') {
				const sessionId = request.headers.get('X-Session-ID');

				if (!sessionId) {
					return Response.json({ error: 'Session ID required' }, { status: 401, headers: corsHeaders });
				}

				// Get session
				const session = await plexAuth.getSession(env, sessionId);
				if (!session) {
					return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
				}

				// Update last access
				await plexAuth.updateSessionAccess(env, sessionId);

				// Get or create Durable Object for this user's conversation
				const conversationId = env.CONVERSATIONS.idFromName(`user:${session.userId}`);
				const conversationStub = env.CONVERSATIONS.get(conversationId);

				// Get conversation history
				const historyResponse = await conversationStub.fetch(new Request('http://do/messages'));
				const { messages: history } = await historyResponse.json<{ messages: Message[] }>();

				// Get user message from request
				const { message } = await request.json<{ message: string }>();

				// Add user message to history
				await conversationStub.fetch(
					new Request('http://do/message', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ role: 'user', content: message }),
					})
				);

				// Create agent and get response
				const agent = new PlexAgent(env, session);
				const allMessages = [...history, { role: 'user' as const, content: message }];
				const chatResult = await agent.chat(allMessages);

				// Save assistant response
				await conversationStub.fetch(
					new Request('http://do/message', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ role: 'assistant', content: chatResult.response }),
					})
				);

			return Response.json(
				{
					response: chatResult.response,
					recommendations: chatResult.recommendations,
					searchResults: chatResult.searchResults,
				},
				{ headers: corsHeaders }
			);
			}

			// Clear conversation history
			if (url.pathname === '/api/conversation/clear' && request.method === 'DELETE') {
				const sessionId = request.headers.get('X-Session-ID');

				if (!sessionId) {
					return Response.json({ error: 'Session ID required' }, { status: 401, headers: corsHeaders });
				}

				const session = await plexAuth.getSession(env, sessionId);
				if (!session) {
					return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
				}

				const conversationId = env.CONVERSATIONS.idFromName(`user:${session.userId}`);
				const conversationStub = env.CONVERSATIONS.get(conversationId);

				await conversationStub.fetch(
					new Request('http://do/messages', {
						method: 'DELETE',
					})
				);

				return Response.json({ success: true }, { headers: corsHeaders });
			}

			// Get conversation history
			if (url.pathname === '/history' && request.method === 'GET') {
				const sessionId = request.headers.get('X-Session-ID');

				if (!sessionId) {
					return Response.json({ error: 'Session ID required' }, { status: 401, headers: corsHeaders });
				}

				const session = await plexAuth.getSession(env, sessionId);
				if (!session) {
					return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
				}

				// Get conversation messages from Durable Object
				const conversationId = env.CONVERSATIONS.idFromName(`user:${session.userId}`);
				const conversationStub = env.CONVERSATIONS.get(conversationId);

				const messagesResponse = await conversationStub.fetch(new Request('http://do/messages'));
				const { messages } = await messagesResponse.json<{ messages: Message[] }>();

				return Response.json({ messages }, { headers: corsHeaders });
			}

			// Health check
			if (url.pathname === '/api/health') {
				return Response.json({ status: 'ok', version: '1.0.0' }, { headers: corsHeaders });
			}

			return new Response('Not Found', { status: 404, headers: corsHeaders });
		} catch (error: any) {
			console.error('Error in request handler:', error);
			console.error('Error stack:', error.stack);
			return Response.json(
				{ error: error.message || 'Internal server error' },
				{ status: 500, headers: corsHeaders }
			);
		}
	},
} satisfies ExportedHandler<Env>;
