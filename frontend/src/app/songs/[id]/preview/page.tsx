import { ArrangementPreview } from "@/components/preview/arrangement-preview";

type SongArrangementPreviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SongArrangementPreviewPage({ params }: SongArrangementPreviewPageProps) {
  const { id } = await params;

  return <ArrangementPreview songId={id} />;
}
