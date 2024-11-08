import { ActionError, createActionHeaders, NextAction } from '@solana/actions';
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
    const word = new URL(req.url).searchParams.get('word');
    if (!gameNumber || !word) {
      throw 'Game Number and word required';
    }

    const payload: NextAction = {
      type: 'action',
      icon: new URL('/image.png', new URL(req.url).origin).toString(),
      label: '',
      title: `You have successfully completed the drawing`,
      description: `Your Game number is ${gameNumber} and the word is ${word}
      Fill the description to give the players some hints. MAke sure to make it vague to make it interesting. Also put some hints which will be accessed by the user by paying, hints should not have the answer. All you cna do is to make it seem easy `,

      links: {
        actions: [
          {
            type: 'post',
            href: `/api/actions/publish-game?gameNumber=${gameNumber}&word=${word}`,
            label: 'Start Game',
            parameters: [
              {
                name: 'description',
                label: 'description',
                type: 'textarea',
                required: true,
              },
              {
                name: 'hint',
                label: 'hint',
                type: 'text',
                required: true,
              },
            ],
          },
        ],
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
