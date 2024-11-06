import { gameUtils } from '@/app/utils/util';

export async function POST(req: Request) {
  try {
    const { gameNumber, timer } = await req.json();
    const updateTimer = await gameUtils.updateTimer(
      Number(gameNumber),
      Number(timer)
    );

    return Response.json({ updateTimer });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return Response.json({ error: 'Failed to get image URL' }, { status: 500 });
  }
}
