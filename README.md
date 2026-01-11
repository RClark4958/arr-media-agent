# Arr Media Agent

An AI-powered assistant for managing your personal media server. Uses natural language to interact with Sonarr, Radarr, Tautulli, and Ombi through a chat interface.

Built on Cloudflare Workers with a React frontend, this agent lets you search, request, and manage your media library using conversational commands.

## Features

- **Natural Language Interface** - Ask for shows and movies in plain English
- **Sonarr Integration** - Search and add TV series to your library
- **Radarr Integration** - Search and add movies to your library
- **Tautulli Integration** - Get personalized recommendations based on watch history
- **Ombi Integration** - Submit requests through approval workflows
- **Plex Authentication** - Secure login with your Plex account
- **Conversation Memory** - Maintains context across your session

## Architecture

```
Frontend (React)          Backend (Cloudflare Worker)
      │                              │
      └──────── HTTPS ───────────────┤
                                     │
                          ┌──────────┴──────────┐
                          │    Workers AI       │
                          │  (Llama 3.1 8B)     │
                          └──────────┬──────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
          ┌───┴───┐              ┌───┴───┐              ┌───┴───┐
          │  D1   │              │  KV   │              │  DO   │
          │ (SQL) │              │(Cache)│              │(State)│
          └───────┘              └───────┘              └───────┘
                                     │
         ┌───────────┬───────────────┼───────────────┬───────────┐
         ▼           ▼               ▼               ▼           ▼
      Sonarr      Radarr         Tautulli         Ombi        Plex
```

## Project Structure

```
arr-media-agent/
├── backend/                 # Cloudflare Worker
│   ├── src/
│   │   ├── ai/             # AI agent and tool definitions
│   │   ├── auth/           # Plex OAuth handling
│   │   ├── clients/        # API clients (Sonarr, Radarr, etc.)
│   │   └── types/          # TypeScript definitions
│   ├── migrations/         # D1 database migrations
│   └── wrangler.jsonc      # Worker configuration
│
└── frontend/               # React chat interface
    ├── src/
    │   ├── components/     # React components
    │   ├── api.ts          # Backend API client
    │   └── types.ts        # Shared types
    └── wrangler.toml       # Pages configuration
```

## Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- Plex account (for authentication)
- At least one of: Sonarr, Radarr, Tautulli, or Ombi

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/RClark4958/arr-media-agent.git
cd arr-media-agent

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Create Cloudflare Resources

```bash
cd backend

# Create D1 database
npx wrangler d1 create media-agent-db
# Copy the database_id to wrangler.jsonc

# Create KV namespace for sessions
npx wrangler kv namespace create SESSIONS
# Copy the id to wrangler.jsonc

# Generate Plex client ID
node -e "console.log('media-agent-' + crypto.randomUUID())"
# Update PLEX_CLIENT_ID in wrangler.jsonc

# Run database migrations
npx wrangler d1 migrations apply media-agent-db
```

### 3. Configure Secrets

```bash
# Set your media server URLs and API keys
npx wrangler secret put SONARR_URL      # e.g., https://sonarr.example.com
npx wrangler secret put SONARR_API_KEY

npx wrangler secret put RADARR_URL
npx wrangler secret put RADARR_API_KEY

npx wrangler secret put TAUTULLI_URL
npx wrangler secret put TAUTULLI_API_KEY

npx wrangler secret put OMBI_URL
npx wrangler secret put OMBI_API_KEY
```

### 4. Deploy

```bash
# Deploy backend
cd backend
npm run deploy

# Deploy frontend
cd ../frontend
npm run build
npx wrangler pages deploy dist --project-name=arr-media-agent
```

## Local Development

### Backend

```bash
cd backend

# Create .dev.vars from example
cp .env.example .dev.vars
# Edit .dev.vars with your API keys

# Start local server
npm run dev
# Available at http://localhost:8787
```

### Frontend

```bash
cd frontend

# Create .env.local
echo "VITE_API_URL=http://localhost:8787" > .env.local

# Start dev server
npm run dev
# Available at http://localhost:5173
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/start` | POST | Initiate Plex OAuth flow |
| `/auth/check` | POST | Check authentication status |
| `/chat` | POST | Send message to AI agent |
| `/history` | GET | Get conversation history |
| `/api/health` | GET | Health check |

## Example Conversations

> **You:** Add Breaking Bad to my library
>
> **Agent:** I found Breaking Bad (2008). It's a critically acclaimed drama about a chemistry teacher who turns to manufacturing. Would you like me to add all 5 seasons to your library?

> **You:** What should I watch tonight?
>
> **Agent:** Based on your recent viewing of sci-fi thrillers, here are some recommendations from your library...

> **You:** Is The Office already in my library?
>
> **Agent:** Yes, The Office (US) is already in your Sonarr library with all 9 seasons available.

## Tech Stack

- **Backend**: TypeScript, Cloudflare Workers, Workers AI (Llama 3.1 8B)
- **Storage**: D1 (SQLite), KV (sessions), Durable Objects (conversations)
- **Frontend**: React, TypeScript, Vite
- **APIs**: Sonarr v3, Radarr v3, Tautulli v2, Ombi, Plex OAuth

## Cost Estimate

Using Cloudflare Workers Paid plan ($5/month):

| Service | Estimate |
|---------|----------|
| Workers AI | ~$0.01 per 1,000 requests |
| D1 | First 5GB free |
| KV | First 1GB free |
| Durable Objects | ~$0.15 per million requests |

**Typical usage**: $5-10/month

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT
