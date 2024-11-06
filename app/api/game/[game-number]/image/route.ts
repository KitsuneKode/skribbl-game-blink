import { gameUtils } from '@/app/utils/util';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ 'game-number': string }> }
) {
  const { 'game-number': gameNumber } = await params;
  const imageUrl = await gameUtils.getImageUrl(Number(gameNumber));
  return Response.json({ imageUrl });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
}
