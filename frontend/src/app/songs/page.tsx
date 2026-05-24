import { PlaceholderPage } from "@/components/placeholder-page";

export default function SongsPage() {
  return (
    <PlaceholderPage
      eyebrow="Songs"
      title="Song catalog"
      description="Placeholder for filtering songs by book, searching by title or number, and opening song detail workflows."
      items={["Song list", "Search and filters", "Song details"]}
    />
  );
}
