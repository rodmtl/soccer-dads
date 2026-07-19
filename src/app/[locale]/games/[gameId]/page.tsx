import { GameDetailScreen } from "@/components/GameDetailScreen";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ locale: string; gameId: string }>;
}) {
  const { gameId } = await params;
  return <GameDetailScreen gameId={gameId} />;
}
