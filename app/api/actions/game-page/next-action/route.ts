import { getMemoFromTransaction, guessCheckFromMemo } from '@/app/utils/util';
import {
  ActionError,
  createActionHeaders,
  NextAction,
  NextActionPostRequest,
} from '@solana/actions';
import { clusterApiUrl, Connection } from '@solana/web3.js';
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

    const body: NextActionPostRequest = await req.json();
    const gameSignature = url.searchParams.get('gameSignature');
    const gameNumber = url.searchParams.get('gameNumber');
    const guess = url.searchParams.get('guess');
    console.log('gameSignature', gameSignature);
    console.log('gameNumber', gameNumber);
    console.log('guess', guess);
    if (!guess) {
      throw 'Guess required';
    }

    if (!gameSignature || !gameNumber) {
      throw 'Game Signature and Game Number required';
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

    if (!response.ok) {
      throw 'Unable to get image';
    }

    const { imageUrl } = await response.json();

    // console.log('imageUrl in next action', imageUrl);

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

    if (!transaction) {
      throw 'Transaction not found';
    }

    const gameMemo = await getMemoFromTransaction(gameSignature, connection);

    const check = await guessCheckFromMemo(
      guess.toString(),
      gameNumber,
      gameMemo
    );
    // const check = false;
    console.log('check', check);

    const gameStatus = check ? 'correct' : 'incorrect';
    console.log('gameStatus', gameStatus);

    const payload: NextAction = {
      type: 'action',
      icon: imageUrl.toString(),
      label: ``,
      title: `Results`,
      description:
        'You have successfully submitted your guess. You cna check your answer submission from this signature' +
        signature,

      links: {
        actions: [
          {
            type: 'message',
            href: '/',
            label: `${
              gameStatus === 'correct' ? 'Congrats' : 'Aw Shucks'
            }! Your answer is ${gameStatus}`,
          },
          {
            type: 'transaction',
            href: '/api/actions/create-game',
            label: 'Create New GAME',
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
