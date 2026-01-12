# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server with Turbopack (http://localhost:3000)
pnpm build        # Build for production
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm prettier     # Format code with Prettier
```

## Architecture

This is a Next.js 16 + React 19 photo gallery frontend that proxies the Synology Photos API. All photo data is fetched server-side through API routes, which handle authentication with the Synology NAS.

### Data Flow

```
Client Components → Next.js API Routes → Synology Photos API
                         ↓
                    Redis (session storage)
```

### Key Layers

**API Routes (`app/api/`)**: Proxy layer to Synology Photos API
- `collections/` - List folders, get folder contents
- `items/[itemId]/` - Photo info, thumbnails, downloads

**Synology Client (`lib/synology/`)**: Handles all Synology API communication
- `client.ts` - Core API caller with session management, auto-relogin on session errors
- `auth.ts` - Login flow using `SYNO.API.Auth`
- `sessionStore.ts` - Redis-backed session persistence with distributed lock

**Visibility Filtering (`lib/api/`)**: Server-side content filtering
- Folders ending with `(hide)` are excluded from listings
- Items tagged with `hide` in Synology Photos are filtered out
- Enforced in `visibility.ts` and `filtering.ts`

### Frontend Components

**Gallery** (`components/gallery/`): Collection browsing UI
- `CollectionBrowser` - Main gallery view combining folders and items
- `FolderGrid`/`ItemGrid` - Grid layouts

**Viewer** (`components/viewer/`): Full-screen photo viewer
- `PhotoViewer` - Image display with swipe gestures
- Uses `useSwipeGesture` hook for touch navigation (swipe left/right for nav, down to close)
- `usePhotoViewer` hook manages viewer state and keyboard controls

### Routing

- `/` - Root collections listing
- `/collection/[...path]` - Nested collection view (path segments are folder IDs)

## Environment Variables

Required for Synology connection:
- `SYNOLOGY_PHOTO_BASE_URL` - NAS URL (e.g., `https://nas.example.com:5001`)
- `SYNOLOGY_USERNAME`, `SYNOLOGY_PASSWORD` - Dedicated Synology user credentials

Required for session storage:
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `SYNOLOGY_ROOT_FOLDER_ID` - Starting folder ID (defaults to listing all accessible folders)
- `NEXT_PUBLIC_TITLE`, `NEXT_PUBLIC_SHORT_TITLE` - App branding
