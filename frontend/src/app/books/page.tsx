import { PlaceholderPage } from "@/components/placeholder-page";

export default function SongBooksPage() {
  return (
    <PlaceholderPage
      eyebrow="Song Books"
      title="Song book management"
      description="Placeholder for managing BE, KJ, PKJ, BNH, and NKB song book records through the backend API."
      items={["Book list", "Create book", "Edit book"]}
    />
  );
}
