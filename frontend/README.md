# Arr Media Agent - Frontend

React chat interface for the AI agent. See the [main README](../README.md) for full documentation.

## Quick Commands

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist
```

## Configuration

Create `.env.local` with your backend URL:

```bash
VITE_API_URL=http://localhost:8787        # For local development
# or
VITE_API_URL=https://your-worker.workers.dev  # For production
```

## Tech Stack

- React 18
- TypeScript
- Vite
- Cloudflare Pages
