# Arr Media Agent - Backend

Cloudflare Worker that powers the AI agent. See the [main README](../README.md) for full documentation.

## Quick Commands

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Deploy to Cloudflare
npm run deploy

# View logs
npx wrangler tail

# Generate types
npm run cf-typegen
```

## Structure

```
src/
├── ai/
│   ├── agent.ts         # AI agent with tool execution
│   └── tools.ts         # Tool definitions for Sonarr/Radarr/etc.
├── auth/
│   └── plex.ts          # Plex OAuth flow
├── clients/
│   ├── sonarr.ts        # Sonarr v3 API client
│   ├── radarr.ts        # Radarr v3 API client
│   ├── tautulli.ts      # Tautulli v2 API client
│   └── ombi.ts          # Ombi API client
├── types/
│   └── index.ts         # TypeScript definitions
├── conversation-do.ts   # Durable Object for conversation state
└── index.ts             # Worker entry point
```

## Configuration

Copy `.env.example` to `.dev.vars` for local development, then update `wrangler.jsonc` with your Cloudflare resource IDs.
