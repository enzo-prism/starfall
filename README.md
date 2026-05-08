# Starfall

Starfall is a local-first browser MMO sandbox: side-view pixel exploration, cozy public social play, mining/building, starter crafting, and classless progression.

## Public Deployment

Starfall is deployed with a split hosting model:

- GitHub: public source repository.
- Railway: long-lived Colyseus WebSocket server for multiplayer.
- Vercel: static React/Vite/Phaser web client.

Vercel serves the browser game only. The realtime server runs on Railway because Starfall needs a persistent WebSocket process for shared rooms, player movement, chat, NPC interactions, and Academy state.

### Production URLs

- Play URL: pending deployment
- Realtime server: pending deployment
- Source: pending deployment

### Production Environment

Railway server variables:

```bash
NODE_ENV=production
STARFALL_DB_PATH=/data/starfall.sqlite
RAILPACK_NODE_VERSION=24
```

Vercel web variable:

```bash
VITE_STARFALL_SERVER_URL=https://your-railway-service-url
```

## Run Locally

```bash
pnpm install
pnpm dev
```

- Web app: `http://localhost:5173`
- Realtime server: `http://localhost:2567`
- Health: `http://localhost:2567/health`

The first playable zone is `Starfall Academy`, a Club Penguin-style social hub with classrooms, dorms, gardens, an observatory, a crafting hall, and a plaza. Guest profiles and world edits persist locally in `apps/server/starfall.sqlite`.

## Scripts

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Architecture

- `apps/web`: React + Vite shell with a Phaser game canvas and code-native HUD.
- `apps/server`: Node + Colyseus authoritative multiplayer server with SQLite persistence.
- `packages/shared`: deterministic world generation, Academy rooms/NPCs/social activities, items, crafting, progression, safety filters, and shared message types.

## Deployment Config

- `vercel.json` builds `@starfall/web`, serves `apps/web/dist`, and rewrites browser routes to `index.html`.
- `railway.json` uses Railpack, runs the server build check, starts `@starfall/server`, and health-checks `/health`.
