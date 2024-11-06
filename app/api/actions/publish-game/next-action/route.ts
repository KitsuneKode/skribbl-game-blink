import {
  ActionError,
  createActionHeaders,
  NextAction,
  NextActionPostRequest,
} from '@solana/actions';
import { clusterApiUrl, Connection } from '@solana/web3.js';

const headers = createActionHeaders();

export const GET = async () => {
  return Response.json({ message: 'Method not supported' } as ActionError, {
    status: 403,
    headers,
  });
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const body: NextActionPostRequest = await req.json();

    let signature: string | undefined;
    try {
      signature = body.signature;
      if (!signature) throw 'Invalid signature';
    } catch (err) {
      if (typeof err == 'string') throw err;
      throw 'Invalid "signature" provided';
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl('devnet')
    );

    try {
      const status = await connection.getSignatureStatus(signature);

      // console.log('signature status:', status);

      if (!status) throw 'Unknown signature status';

      // only accept `confirmed` and `finalized` transactions
      if (status.value?.confirmationStatus) {
        if (
          status.value.confirmationStatus != 'confirmed' &&
          status.value.confirmationStatus != 'finalized'
        ) {
          throw 'Unable to confirm the transaction';
        }
      }

      // todo: check for a specific confirmation status if desired
      // if (status.value?.confirmationStatus != "confirmed")
    } catch (err) {
      if (typeof err == 'string') throw err;
      throw 'Unable to confirm the provided signature';
    }

    /**
     * !TAKE CAUTION!
     *
     * since any client side request can access this public endpoint,
     * a malicious actor could provide a valid signature that does NOT
     * perform the previous action's transaction.
     *
     * todo: validate this transaction is what you expected the user to perform in the previous step
     */

    // manually get the transaction to process and verify it
    const transaction = await connection.getParsedTransaction(
      signature,
      'confirmed'
    );
    console.log('transaction:', transaction);

    const gameNumber = new URL(req.url).searchParams.get('gameNumber');

    const payload: NextAction = {
      type: 'action',
      icon: new URL('/image.png', new URL(req.url).origin).toString(),
      label: '',
      title: `Game Created`,
      description: `Your game has been created successfully`,
      links: {
        actions: [
          {
            type: 'external-link',
            href: `/api/actions/publish-game/next-action/game-state?gameNumber=${gameNumber}&signature=${signature}`,
            label: 'Game Page',
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
