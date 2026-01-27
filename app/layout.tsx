import { VisitorTracker } from "@/components/analytics/visitor-tracker";
import { DeferredComponents } from "@/components/deferred-components";
import Footer from "@/components/footer";
import ServiceWorker from "@/components/pwa/service-worker";
import { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3001";

const title = process.env.NEXT_PUBLIC_TITLE
  ? process.env.NEXT_PUBLIC_TITLE
  : "Synology Photo Platform";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title,
  applicationName: title,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "msapplication-square70x70logo": "/icons/tiny.png",
    "msapplication-square150x150logo": "/icons/square.png",
    "msapplication-wide310x150logo": "/icons/wide.png",
    "msapplication-square310x310logo": "/icons/large.png",
  },
  icons: {
    icon: [
      {
        url: "/icons/favicon.ico",
        type: "image/x-icon",
      },
      {
        url: "/icons/icon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/icons/icon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "/icons/favicon.ico",
        type: "image/x-icon",
      },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon-57x57.png",
        sizes: "57x57",
      },
      {
        url: "/icons/apple-touch-icon-76x76.png",
        sizes: "76x76",
      },
      {
        url: "/icons/apple-touch-icon-120x120.png",
        sizes: "120x120",
      },
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
      },
      {
        url: "/icons/apple-touch-icon-152x152.png",
        sizes: "152x152",
      },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/icons/apple-touch-icon-precomposed.png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={geistSans.variable}>
      <body className="bg-background text-foreground overflow-x-hidden flex flex-col min-h-screen">
        {children}
        <Footer />
        <ServiceWorker />
        <DeferredComponents />
        <VisitorTracker />
      </body>
    </html>
  );
}
