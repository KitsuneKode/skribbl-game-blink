import {
  ActionError,
  ActionPostRequest,
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
  MEMO_PROGRAM_ID,
} from '@solana/actions';
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

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
    const gameSignature = url.searchParams.get('signature');
    const gameNumber = url.searchParams.get('gameNumber');
    if (!gameSignature || !gameNumber) {
      throw 'Game Signature and Game Number required';
    }

    const body: ActionPostRequest = await req.json();
    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (error) {
      return Response.json({ message: 'Invalid Account', error }, { headers });
    }
    const connection = new Connection(clusterApiUrl('devnet'));

    const TO_PUB_KEY = new PublicKey(
      '5ZVUHrjHtD6tLDScordsosj8wvdXYU2Mu6vjR49xT3Ku'
    );

    const { fieldData: hint } = await (
      await fetch(
        new URL(
          `/api/game/${gameNumber}/hint/getData`,
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

    console.log(hint);

    const amount = 0.005;

    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(
          `you opted for hint for game Sessin number: ${gameNumber}`,
          'utf8'
        ),
        keys: [{ pubkey: account, isSigner: true, isWritable: true }],
      }),

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
        message: 'Opted for hint',
        links: {
          next: {
            type: 'post',
            href: `/api/actions/game-page/hint/next-action?gameNumber=${gameNumber}&gameSignature=${gameSignature}&hint=${hint}`,
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
