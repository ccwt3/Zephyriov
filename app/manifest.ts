import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zephyriov — Chess Opening Trainer",
    short_name: "Zephyriov",
    description:
      "Learn the chess openings you actually play, with spaced repetition.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#722F37",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
