import { PlaceholderPage } from "@/components/placeholder-page";

export default function EditorPage() {
  return (
    <PlaceholderPage
      eyebrow="Editor"
      title="Line-based arrangement editor"
      description="Placeholder for editing VERSE, REFRAIN, and TEXT_ONLY_VERSES sections through song_arrangements.content_json without exposing raw JSON."
      items={["Section editor", "Notation lines", "Lyrics by verse"]}
    />
  );
}
