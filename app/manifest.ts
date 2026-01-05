import { MetadataRoute } from "next";

const title = process.env.NEXT_PUBLIC_TITLE ?? "Synology Photo Platform";
const shortTitle = process.env.NEXT_PUBLIC_SHORT_TITLE ?? "Synology Photos";
const description =
  process.env.NEXT_PUBLIC_DESCRIPTION ??
  "Securely browse, manage, and share your Synology photo library.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: title,
    short_name: shortTitle,
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "de",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
