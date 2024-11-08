import {
  ActionGetResponse,
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
  actionVersion: '2.1.3',
});

export const GET = async (req: Request) => {
  try {
    const gameNumber = new URL(req.url).searchParams.get('gameNumber');
    const signature = new URL(req.url).searchParams.get('signature');
    if (!gameNumber || !signature) throw 'Game Number and signature required';

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
      throw 'Unable to fetch image';
    }

    const { imageUrl } = await response.json();

    const response2 = await fetch(
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
    );

    const { fieldData: description } = await response2.json();

    const payload: ActionGetResponse = {
      icon: imageUrl.toString(),
      title: ` Skribbl onChain: Draw anyday anytime and let others guess.\n 
      Your playing game session number ${gameNumber} `,
      description:
        `Bet on the outcomes of Scribble and your session number is ${gameNumber} and the signature of the game is ${signature}` +
        '\n The description of the game is given below \n' +
        description,
      label: '',
      links: {
        actions: [
          {
            type: 'transaction',
            href: `/api/actions/game-page/hint?gameNumber=${gameNumber}&signature=${signature}`,
            label: 'Pay for Hint',
          },
          {
            type: 'transaction',
            href: `/api/actions/game-page?gameNumber=${gameNumber}&signature=${signature}`,
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
  } catch (err) {
    let message = 'Something went wrong';
    if (typeof err === 'string') message = err;
    console.error(err);
    Response.json({ message }, { headers, status: 400 });
  }
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest = await req.json();
    let account: PublicKey;

    try {
      account = new PublicKey(body.account);
    } catch (error) {
      return Response.json({ message: 'Invalid Account', error }, { headers });
    }
    const connection = new Connection(clusterApiUrl('devnet'));

    const gameNumber = new URL(req.url).searchParams.get('gameNumber');
    const gameSignature = new URL(req.url).searchParams.get('signature');

    if (!gameNumber || !gameSignature) {
      throw 'Game Number and signature required';
    }
    await checkGameSignature(gameSignature, connection);

    const guess = (body.data as { guess?: string }).guess?.toLowerCase();

    const TO_PUB_KEY = new PublicKey(process.env.PUBLIC_KEY!);
    const amount = 0.005;
    const memo = JSON.stringify({
      gameNumber,
      gameSignature,
      guess,
      signer: account.toBase58(),
    });

    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(memo, 'utf8'),
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
        message: 'You have successfully submitted your guess',
        links: {
          next: {
            type: 'post',
            href: `/api/actions/game-page/next-action?gameNumber=${gameNumber}&gameSignature=${gameSignature}&guess=${guess}`,

            //   action: {
            //     type: 'completed',
            //     description: 'You completed it',
            //     icon: new URL(
            //       '/fashion.jpeg',
            //       new URL(req.url).origin
            //     ).toString(),
            //     label: 'Your answer was correct',
            //     title: 'Results',
            //     disabled: true,
            //   },
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

const checkGameSignature = async (
  signature: string,
  connection: Connection
) => {
  try {
    const status = await connection.getSignatureStatus(signature);

    console.log('signature status:', status);

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
};
