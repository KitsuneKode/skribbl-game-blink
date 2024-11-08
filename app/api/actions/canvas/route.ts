import {
  ActionError,
  ActionPostResponse,
  createActionHeaders,
} from '@solana/actions';
const headers = createActionHeaders({
  chainId: 'devnet',
});

export const GET = async () => {
  return Response.json({ message: 'Method not supported' } as ActionError, {
    status: 403,
    headers,
  });
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);

    const gameNumber = url.searchParams.get('gameNumber');
    const word = url.searchParams.get('word');
    if (!gameNumber || !word) {
      throw 'Game Number and word required';
    }

    const payload: ActionPostResponse = {
      type: 'external-link',
      externalLink:
        new URL(req.url).origin.toString() + `/canvas/${gameNumber}/${word}`,
      links: {
        next: {
          type: 'post',
          href: `/api/actions/canvas/next-action?gameNumber=${gameNumber}&word=${word}`,
        },
      },
    };
    return Response.json(payload, { headers });
  } catch (error) {
    return Response.json(
      { message: 'Something went Wrong', error },
      { headers }
    );
  }
};
