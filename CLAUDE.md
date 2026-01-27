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
```

### Key Layers

**API Routes (`app/api/`)**: Proxy layer to Synology Photos API

- `collections/` - List folders, get folder contents
- `items/[itemId]/` - Photo info, thumbnails, downloads
- `admin/` - Admin authentication and management endpoints
- `analytics/` - Analytics tracking and stats
- `reports/` - Photo reporting endpoint
- `feedback/` - User feedback endpoint

**Synology Client (`lib/synology/`)**: Handles all Synology API communication

- `client.ts` - Core API caller with per-request authentication
- `auth.ts` - Login flow using `SYNO.API.Auth`
- `sessionStore.ts` - Short-lived in-memory session cache (5s TTL) with login mutex

**Visibility Filtering (`lib/api/`)**: Server-side content filtering

- Folders ending with `(hide)` are excluded from listings
- Configurable visibility mode for items (`PHOTO_VISIBILITY_MODE`):
  - `hide` mode (default): All photos visible, tag with "hide" to exclude
  - `show` mode: No photos visible by default, tag with "show" to include
- Root folder boundary: `SYNOLOGY_ROOT_FOLDER_ID` restricts navigation to a subtree
- Enforced in `visibilityConfig.ts`, `filtering.ts`, and `folderBoundary.ts`

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
- `/admin` - Admin dashboard (requires authentication)
- `/admin/login` - Admin login page
- `/admin/feedback` - Feedback management
- `/admin/reports` - Photo reports management

## Environment Variables

Required:

- `SYNOLOGY_PHOTO_BASE_URL` - NAS URL (e.g., `https://nas.example.com:5001`)
- `SYNOLOGY_USERNAME`, `SYNOLOGY_PASSWORD` - Dedicated Synology user credentials
- `MONGODB_URI` - MongoDB connection string (for analytics, reports, feedback, rate limiting)

Optional:

- `SYNOLOGY_ROOT_FOLDER_ID` - Starting folder ID, restricts users to this folder and subfolders only
- `PHOTO_VISIBILITY_MODE` - Photo visibility mode: "hide" (default) or "show"
- `NEXT_PUBLIC_TITLE`, `NEXT_PUBLIC_SHORT_TITLE` - App branding
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET` - Enable admin dashboard (all three required)

## Code Style

- Minimize comments. Code should be self-documenting through clear naming and structure
- Only add comments for non-obvious values (e.g., `// 5 minutes` for TTL constants) or complex business logic
- Remove unnecessary comments during code changes
- No TODO comments, JSDoc blocks, or explanatory comments for straightforward code
