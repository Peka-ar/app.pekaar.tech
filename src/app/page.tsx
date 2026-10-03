import { permanentRedirect } from "next/navigation";

// The marketing site owns the apex now (pekaar.tech → Astro). The app lives at
// app.pekaar.tech; the root is a permanent redirect so old bookmarks and any
// apex-rooted links land on the marketing home.
export default function Home() {
  permanentRedirect("https://pekaar.tech");
}
