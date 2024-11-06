import DrawingPanel from '@/app/components/drawing-panel';

interface CanvasProps {
  params: Promise<{
    word: string;
    gameNumber: string;
  }>;
}

export default async function Canvas({ params }: CanvasProps) {
  const { word, gameNumber } = await params;

  return <DrawingPanel word={word} gameNumber={gameNumber} />;
}
