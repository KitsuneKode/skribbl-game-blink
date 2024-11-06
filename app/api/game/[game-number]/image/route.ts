import { gameUtils } from '@/app/utils/util';

export async function GET(
  req: Request,
  { params }: { params: { 'game-number': string } }
) {
  const gameNumber = await params['game-number'];
  const imageUrl = await gameUtils.getImageUrl(Number(gameNumber));
  return Response.json({ imageUrl });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
}
