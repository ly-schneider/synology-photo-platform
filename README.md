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
- **Progressive Web App** - Install on mobile devices for an app-like experience
- **Centralized Session Management** - Uses Redis for shared authentication across all clients

## How It Works

This application acts as a lightweight frontend proxy to the Synology Photos API:

1. **Authentication** - The app authenticates with Synology Photos using a dedicated user account
2. **Session Storage** - Authentication sessions are stored in Redis, shared across all clients
3. **API Proxy** - All photo requests are proxied through Next.js API routes to Synology Photos
4. **Thumbnail Loading** - Efficient thumbnail loading with lazy loading for optimal performance
5. **Direct Downloads** - Full-resolution image downloads directly from your Synology NAS

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with React 19
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Radix UI](https://radix-ui.com/) components
- **Session Storage**: [Upstash Redis](https://upstash.com/)
- **Deployment**: Optimized for [Vercel](https://vercel.com/)
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- A Synology NAS with Synology Photos installed
- A dedicated Synology user account for API access
- An Upstash Redis account (free tier available)
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
   # Upstash Redis configuration (get from https://upstash.com/)
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token

   # Synology Photos configuration
   SYNOLOGY_PHOTO_BASE_URL=https://your-nas.example.com:5001
   SYNOLOGY_USERNAME=your_synology_username
   SYNOLOGY_PASSWORD=your_synology_password

   # App customization (optional)
   NEXT_PUBLIC_TITLE=Photo Gallery
   NEXT_PUBLIC_SHORT_TITLE=Photos
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

You can control what content appears in the platform:

- **Hide Folders**: Add the suffix `(hide)` to any folder name to exclude it from the interface (e.g., `Private Photos (hide)`)
- **Hide Images**: Tag individual images with the `hide` tag in Synology Photos to exclude them from the gallery

These filters are enforced server-side, ensuring hidden content remains secure and inaccessible through the platform.

### Redis Session Storage

The app uses Upstash Redis to store Synology authentication sessions. This enables:

- Shared sessions across all users
- Reduced authentication requests to your NAS
- Improved performance and reliability

The free Redis database tier should suffice for most use cases. Get yours at [upstash.com](https://upstash.com/).

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
│   ├── api/               # API routes (Synology proxy)
│   │   ├── collections/  # Folder/collection endpoints
│   │   └── items/        # Photo item endpoints
│   ├── page.tsx          # Main gallery page
│   └── layout.tsx        # App layout
├── components/            # Reusable UI components
├── lib/                   # Core library code
│   ├── api/              # API utilities and filters
│   ├── synology/         # Synology API client and auth
│   └── redis.ts          # Redis connection
└── public/               # Static assets
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
- Session data is securely stored in Redis with automatic expiration
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
