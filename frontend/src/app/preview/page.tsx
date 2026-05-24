import { PlaceholderPage } from "@/components/placeholder-page";

export default function PreviewPage() {
  return (
    <PlaceholderPage
      eyebrow="Preview"
      title="Slide preview"
      description="Placeholder for rendering selected verses and refrain behavior from the canonical arrangement content."
      items={["Verse selection", "Refrain mode", "Slide cards"]}
    />
  );
}
