import { gameUtils } from '@/app/utils/util';

export async function POST() {
  try {
    const gameNumber = await gameUtils.createGame();
    return Response.json({ gameNumber });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return Response.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
