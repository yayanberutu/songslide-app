import { ArrangementEditor } from "@/components/editor/arrangement-editor";

type SongArrangementEditorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SongArrangementEditorPage({ params }: SongArrangementEditorPageProps) {
  const { id } = await params;

  return <ArrangementEditor songId={id} />;
}
