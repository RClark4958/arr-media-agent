import { DurableObject } from 'cloudflare:workers';
import type { Env, Message } from './types';

export class ConversationDO extends DurableObject<Env> {
	private messages: Message[] = [];

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		// Initialize from storage on first access
		this.ctx.blockConcurrencyWhile(async () => {
			const stored = await this.ctx.storage.get<Message[]>('messages');
			if (stored) {
				this.messages = stored;
			}
		});
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Add a message to conversation history
		if (request.method === 'POST' && url.pathname === '/message') {
			const { role, content } = await request.json<{ role: string; content: string }>();

			this.messages.push({ role: role as 'user' | 'assistant' | 'system', content });

			// Keep only last 20 messages for context
			if (this.messages.length > 20) {
				this.messages = this.messages.slice(-20);
			}

			await this.ctx.storage.put('messages', this.messages);

			return Response.json({ success: true, messageCount: this.messages.length });
		}

		// Get all messages
		if (request.method === 'GET' && url.pathname === '/messages') {
			return Response.json({ messages: this.messages });
		}

		// Clear conversation history
		if (request.method === 'DELETE' && url.pathname === '/messages') {
			this.messages = [];
			await this.ctx.storage.delete('messages');
			return Response.json({ success: true });
		}

		return new Response('Not found', { status: 404 });
	}
}
