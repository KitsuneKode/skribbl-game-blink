import { gameUtils } from '@/app/utils/util';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ 'game-number': string }> }
) {
  try {
    const { description, hint } = await req.json();
    const { 'game-number': gameNumber } = await params;
    console.log(
      'gameNumber',
      gameNumber,
      'description',
      description,
      'hint',
      hint
    );

    const uploadStatus = await gameUtils.uploadGameDetails(
      Number(gameNumber),
      description,
      hint
    );

    return Response.json({ uploadStatus });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return Response.json({ error: 'Failed to upload data' }, { status: 500 });
  }
}
