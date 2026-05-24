import { PlaceholderPage } from "@/components/placeholder-page";

export default function DashboardPage() {
  return (
    <PlaceholderPage
      eyebrow="Dashboard"
      title="SongSlide MVP"
      description="Operator workspace for cataloging church songs, editing numbered notation, previewing slides, and exporting selected verses."
      items={["Song book catalog", "Recent songs", "Export status"]}
    />
  );
}
