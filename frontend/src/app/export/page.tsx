import { PlaceholderPage } from "@/components/placeholder-page";

export default function ExportPage() {
  return (
    <PlaceholderPage
      eyebrow="Export"
      title="PPTX and PNG export"
      description="Placeholder for choosing export options, requesting backend orchestration, and downloading generated files."
      items={["Output format", "Layout options", "Download link"]}
    />
  );
}
