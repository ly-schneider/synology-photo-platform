# Synology Photo Platform

<div align="center">
<img width="250" alt="showcase-directory" src="https://github.com/user-attachments/assets/dc84994b-9b24-4d34-a981-4420617d3f2b" />
<img width="250" alt="showcase-thumbnails" src="https://github.com/user-attachments/assets/b5dcb9a0-ad26-4781-90df-2942ef844ab9" />
<img width="250" alt="showcase-image" src="https://github.com/user-attachments/assets/fa1690cb-0fb3-472e-b582-b16f1cae45ea" />
</div>

A lightweight, mobile-first photo gallery frontend for Synology Photos, designed for seamless public photo sharing without the limitations of Synology's native interface.

## Why This Exists

At ICF Bern, we needed a simple way to share event photos with our church community. While Synology Photos is excellent for photo management, its native sharing interface wasn't ideal for public sharing. As organizers, we didn't want to subscribe to external platforms or manage photos across multiple services.

Since Synology Photos provides a comprehensive API, this project bridges the gap by offering a clean, purpose-built frontend that integrates directly with your existing Synology NAS.

## Features

- **Clean, Mobile-First Interface** - Optimized for viewing photos on any device
- **Folder Navigation** - Browse through your photo collections with an intuitive folder structure
- **Full-Screen Image Viewer** - View high-resolution photos with smooth transitions
- **Touch Gestures** - Swipe horizontally to navigate between photos, swipe down to close
- **Keyboard Navigation** - Use arrow keys to navigate, Escape to close (desktop)
- **Download & Share** - Native share sheet integration for easy saving and sharing
- **Photo Reporting** - Users can flag inappropriate photos for moderation
- **Analytics Dashboard** - Track folder views, item views, downloads, and unique visitors with a protected admin dashboard
- **Progressive Web App** - Install on mobile devices for an app-like experience
- **Serverless Ready** - Per-request authentication works seamlessly on Vercel and other serverless platforms

## How It Works

This application acts as a lightweight frontend proxy to the Synology Photos API:

1. **Per-Request Authentication** - Each API request authenticates with Synology Photos, avoiding session/IP binding issues on serverless platforms
2. **API Proxy** - All photo requests are proxied through Next.js API routes to Synology Photos
3. **Thumbnail Loading** - Efficient thumbnail loading with lazy loading and browser caching
4. **Direct Downloads** - Full-resolution image downloads directly from your Synology NAS

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with React 19
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Radix UI](https://radix-ui.com/) components
- **Database**: [MongoDB](https://www.mongodb.com/) for photo reports, user feedback, rate limiting, and analytics
- **Deployment**: Optimized for [Vercel](https://vercel.com/)
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- A Synology NAS with Synology Photos installed
- A dedicated Synology user account for API access
- Node.js 20+ and pnpm installed

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/ly-schneider/synology-photo-platform.git
   cd synology-photo-platform
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Required environment variables:

   ```env
   # Synology Photos configuration (required)
   SYNOLOGY_PHOTO_BASE_URL=https://your-nas.example.com:5001
   SYNOLOGY_USERNAME=your_synology_username
   SYNOLOGY_PASSWORD=your_synology_password

   # MongoDB (required for reports, feedback, rate limiting, and analytics)
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/synology-photo-platform

   # Content visibility (optional)
   SYNOLOGY_ROOT_FOLDER_ID=123          # Restrict to specific folder subtree
   PHOTO_VISIBILITY_MODE=hide           # "hide" or "show" (default: hide)

   # App customization (optional)
   NEXT_PUBLIC_TITLE=Photo Gallery
   NEXT_PUBLIC_SHORT_TITLE=Photos

   # Admin Authentication (optional - enables analytics dashboard)
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=secure-password-here
   ADMIN_JWT_SECRET=your-256-bit-secret-key
   ```

4. **Run the development server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment

#### Deploy to Vercel

1. Push your code to a GitHub repository
2. Import the project in [Vercel](https://vercel.com/new)
3. Configure the environment variables in the Vercel dashboard
4. Deploy

Vercel will automatically detect Next.js and configure the build settings.

#### Deploy Elsewhere

This is a standard Next.js application and can be deployed to any platform that supports Node.js:

```bash
pnpm build
pnpm start
```

## Configuration

### Synology User Permissions

Create a dedicated Synology user account with the following permissions:

- Read access to the photo libraries you want to share
- Synology Photos application access
- No admin privileges required

**Important**: Be careful which folders you grant this user access to. Only provide access to folders you want to be publicly visible through the platform.

### Content Visibility Controls

You can control what content appears in the platform through several mechanisms:

#### Folder Visibility

- **Hide Folders**: Add the suffix `(hide)` to any folder name to exclude it from the interface (e.g., `Private Photos (hide)`)
- **Root Folder Boundary**: Set `SYNOLOGY_ROOT_FOLDER_ID` to restrict navigation to a specific folder and its subfolders. Users cannot navigate outside this boundary.

#### Photo Visibility Modes

Control which photos are visible using the `PHOTO_VISIBILITY_MODE` environment variable:

| Mode             | Behavior                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `hide` (default) | All photos are visible. Tag photos with `hide` in Synology Photos to exclude them.                 |
| `show`           | No photos are visible by default. Only photos tagged with `show` in Synology Photos are displayed. |

This is useful for curating galleries - use `show` mode when you want to hand-pick which photos appear, or `hide` mode when you want everything visible except specific exclusions.

#### Photo Reporting

Users can report inappropriate photos directly from the viewer. Reported photos are:

- Stored in MongoDB for moderation review
- Instantly hidden from the gallery (no page refresh required)
- Blocked from direct access (thumbnails, downloads, info endpoints return 404)
- Rate limited to prevent abuse (10 reports per minute per IP)
- Duplicate reports from the same IP for the same photo are prevented within 1 hour

#### User Feedback

Users can submit feedback through the footer. Feedback submissions are:

- Stored in MongoDB for review
- Rate limited to prevent spam (5 submissions per minute per IP)
- Limited to 5000 characters per message

**MongoDB Collections:**

- `reports` - Per-item reports with `clientId` (deduped per client per hour), TTL 30 days, keeps newest 200 per item
- `feedback` - Feedback messages (TTL 90 days, capped to latest 1000)
- `rate_limits` - Sliding-window rate limit state per endpoint + client

All visibility filters are enforced server-side, ensuring hidden content remains secure and inaccessible through the platform.

### Analytics Dashboard

The platform includes a built-in analytics dashboard to track usage metrics. Access it at `/admin` after configuring the admin environment variables.

#### Tracked Metrics

| Metric              | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| **Unique Visitors** | Daily unique visitors based on hashed client identifiers (no PII stored) |
| **Folder Views**    | Number of times each folder/collection is viewed                         |
| **Item Views**      | Number of times each photo is viewed in the full-screen viewer           |
| **Downloads**       | Number of photo downloads                                                |

#### Dashboard Features

- **Period Selector** - View stats for 7 days, 30 days, 90 days, or all time
- **Summary Cards** - Total visitors, folder views, item views, and downloads
- **Popular Lists** - Top 10 folders, items by views, and items by downloads

#### Security

- Admin authentication using JWT tokens stored in httpOnly cookies
- Rate limiting on login attempts (5 per 15 minutes per IP)
- Constant-time password comparison to prevent timing attacks
- 24-hour session expiry with automatic logout

#### MongoDB Data Structure

Analytics events are stored in the `analytics_events` collection:

```javascript
{
  type: "folder_view" | "item_view" | "item_download" | "visitor",
  folderId: string,      // For folder_view events
  folderName: string,    // For folder_view events
  itemId: string,        // For item_view and item_download events
  itemFilename: string,  // For item_view and item_download events
  visitorId: string,     // Hashed client identifier
  timestamp: Date,
  date: string           // "YYYY-MM-DD" for daily aggregation
}
```

Indexes are created automatically for efficient querying. A TTL index removes events older than 365 days.

## Development

### Available Scripts

```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript type checking
pnpm prettier     # Format code with Prettier
```

### Project Structure

```
synology-photo-platform/
├── app/                    # Next.js app directory
│   ├── api/                # API routes
│   │   ├── admin/          # Admin authentication endpoints
│   │   ├── analytics/      # Analytics tracking and stats endpoints
│   │   ├── collections/    # Folder/collection endpoints
│   │   ├── items/          # Photo item endpoints
│   │   ├── reports/        # Photo reporting endpoint
│   │   └── feedback/       # User feedback endpoint
│   ├── admin/              # Admin dashboard pages
│   ├── page.tsx            # Main gallery page
│   └── layout.tsx          # App layout
├── components/             # Reusable UI components
│   ├── admin/              # Admin dashboard components
│   └── analytics/          # Analytics tracking components
├── lib/                    # Core library code
│   ├── admin/              # Admin authentication utilities
│   ├── api/                # API utilities, filters, and rate limiting
│   ├── mongodb/            # MongoDB client and analytics/reporting helpers
│   └── synology/           # Synology API client and auth
├── types/                  # TypeScript type definitions
└── public/                 # Static assets
```

## How You Can Use This

This project is open source and ready to fork:

1. **Fork this repository** to your GitHub account
2. **Customize** the styling, branding, and features for your needs
3. **Configure** your Synology NAS endpoint and credentials
4. **Deploy** to Vercel or your preferred hosting platform
5. **Share** the URL with your community

Perfect for:

- Churches and community groups sharing event photos
- Photographers sharing galleries with clients
- Families sharing private photo collections
- Organizations with existing Synology infrastructure

## Security Considerations

- The Synology credentials are stored as environment variables and never exposed to the client
- All API requests are proxied through Next.js API routes
- Per-request authentication ensures no session data is persisted between requests
- Reported photos are immediately hidden and blocked from all access points
- Visibility filters (tags, folders, root boundary) are enforced server-side
- Admin dashboard protected by JWT authentication with rate-limited login
- Analytics data contains no personally identifiable information (visitor IDs are hashed)
- Use HTTPS in production (automatic with Vercel)
- Consider restricting access to specific photo folders in your Synology user permissions

## Contributing

Contributions are welcome! Feel free to:

- Report bugs or issues
- Suggest new features
- Submit pull requests

## License

MIT License

## Acknowledgments

Built with love for the ICF community and anyone else who needs a simple, beautiful way to share photos from their Synology NAS.

---

**Questions or issues?** Open an issue on GitHub or fork the project and make it your own.
