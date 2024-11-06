import { gameUtils } from '@/app/utils/util';

export async function GET(
  req: Request,
  context: { params: Promise<{ 'game-number': string; field: string }> }
) {
  try {
    const { 'game-number': gameNumber, field } = await context.params;

    const fieldData = await gameUtils.getDetail(Number(gameNumber), field);
    return Response.json({ fieldData });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return Response.json({ error: 'Failed to get data' }, { status: 500 });
  }
}
