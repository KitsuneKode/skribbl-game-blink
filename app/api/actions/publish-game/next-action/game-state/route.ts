import {
  ActionError,
  ActionPostResponse,
  createActionHeaders,
} from '@solana/actions';
const headers = createActionHeaders({
  chainId: 'devnet',
  actionVersion: '2.1.3',
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
    const gameNumber = new URL(req.url).searchParams.get('gameNumber');
    const signature = new URL(req.url).searchParams.get('signature');
    const externalLink = `https://dial.to/?action=solana-action:${encodeURIComponent(
      `${
        new URL(req.url).origin
      }/api/actions/game-page?gameNumber=${gameNumber}&signature=${signature}`
    )}&cluster=devnet`;

    const payload: ActionPostResponse = {
      type: 'external-link',
      externalLink,
      links: {
        next: {
          type: 'inline',
          action: {
            title: 'Game Created',
            description: `Your game has been created successfully
            The game session number is ${gameNumber} and you can access by 
            this link below:\n
             ${externalLink}`,
            icon: new URL('/image.png', new URL(req.url).origin).toString(),
            label: 'Your Game is Created',
            type: 'completed',
            disabled: true,
          },
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
