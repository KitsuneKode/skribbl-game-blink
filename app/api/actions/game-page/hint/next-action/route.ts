import {
  ActionError,
  createActionHeaders,
  NextAction,
  NextActionPostRequest,
} from '@solana/actions';
import { clusterApiUrl, Connection } from '@solana/web3.js';
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
    const url = new URL(req.url);

    const gameNumber = url.searchParams.get('gameNumber');
    const gameSignature = url.searchParams.get('gameSignature');

    if (!gameNumber || !gameSignature) {
      throw 'Game Number and Game Signature required';
    }

    const body: NextActionPostRequest = await req.json();

    let signature: string | undefined;
    try {
      signature = body.signature;
      if (!signature) throw 'Invalid signature';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      throw 'Invalid "signature" provided';
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl('devnet')
    );

    try {
      const status = await connection.getSignatureStatus(signature);

      if (!status) throw 'Unknown signature status';

      if (status.value?.confirmationStatus) {
        if (
          status.value.confirmationStatus != 'confirmed' &&
          status.value.confirmationStatus != 'finalized'
        ) {
          throw 'Unable to confirm the transaction';
        }
      }
    } catch (err) {
      if (typeof err == 'string') throw err;
      throw 'Unable to confirm the provided signature';
    }

    const transaction = await connection.getParsedTransaction(
      signature,
      'confirmed'
    );
    if (!transaction) throw 'Invalid Transaction';

    const { fieldData: description } = await (
      await fetch(
        new URL(
          `/api/game/${gameNumber}/description/getData`,
          new URL(req.url).origin
        ).toString(),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    ).json();

    const hint = url.searchParams.get('hint');
    if (!hint) {
      throw 'Hint required';
    }

    const response = await fetch(
      new URL(
        `/api/game/${gameNumber}/image`,
        new URL(req.url).origin
      ).toString(),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const { imageUrl } = await response.json();

    const payload: NextAction = {
      type: 'action',
      icon: imageUrl.toString(),
      label: ``,
      title: `Skribbl onChain: Draw anyday anytime and let others guess.\n\n
      Your playing game session number ${gameNumber}\nThe Hint is ${hint}\n\n`,
      description:
        `Bet on the outcomes of Scribble and your session number is ${gameNumber} and the signature of the game is ${signature}` +
        '\n\nThe description of the game is given below\n\n' +
        description,

      links: {
        actions: [
          {
            type: 'transaction',
            href: `/api/actions/game-page?gameNumber=${gameNumber}&signature=${gameSignature}`,
            label: 'Your Guess',
            parameters: [
              {
                type: 'text',
                name: 'guess',
                label: 'Your Guess',
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
