import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
} from '@solana/actions';
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

const headers = createActionHeaders({
  chainId: 'devnet',
  actionVersion: '2.1.3',
});

export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    icon: new URL('/bull.jpg', new URL(req.url).origin).toString(),
    title: 'Skribbl OnChain',
    description:
      'Bet on the outcomes of Scribble. Get your game number and word to draw and let others guess.',
    label: '',
    links: {
      actions: [
        {
          type: 'post',
          href: '/api/actions/create-game',
          label: 'Initiate Game Session',
        },
      ],
    },
  };

  return Response.json(payload, { headers });
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
      console.log('Account:', account.toBase58());
    } catch (error) {
      return Response.json({ message: 'Invalid Account', error }, { headers });
    }
    const connection = new Connection(clusterApiUrl('devnet'));

    const TO_PUB_KEY = new PublicKey(
      '5ZVUHrjHtD6tLDScordsosj8wvdXYU2Mu6vjR49xT3Ku'
    );
    const amount = 0.0005;
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: TO_PUB_KEY,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    transaction.feePayer = account;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: 'transaction',
        transaction,
        message: 'Your transaction is signed',
        links: {
          next: {
            type: 'post',
            href: '/api/actions/create-game/next-action',
          },
        },
      },
    });
    return Response.json(payload, { headers });
  } catch (error) {
    return Response.json(
      { message: 'Something went Wrong', error },
      { headers }
    );
  }
};
