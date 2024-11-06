import { getRandomWord } from '@/app/utils/util';
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
    /**
     * we can type the `body.data` to what fields we expect from the GET response above
     */
    const body: NextActionPostRequest = await req.json();

    // body will contain the user's `account` and `memo` input from the user

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

    /**
     * todo: do we need to manually re-confirm the transaction?
     * todo: do we need to perform multiple confirmation attempts
     */

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

    const fetchUrl = new URL(req.url).origin.toString() + '/api/game/new-game';

    const word = getRandomWord();
    const response = await fetch(fetchUrl, {
      method: 'POST',
    });

    const { gameNumber } = await response.json();
    console.log('gameNumber:', gameNumber);

    const payload: NextAction = {
      type: 'action',
      icon: new URL('/image.png', new URL(req.url).origin).toString(),
      label: ``,
      title: `Your word is ${word} and the game number is ${gameNumber}`,
      description: `Click on the link below to start drawing`,

      links: {
        actions: [
          {
            type: 'external-link',
            href: `/api/actions/canvas?gameNumber=${gameNumber}&word=${word}`,
            label: 'Drawing Canvas here',
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
