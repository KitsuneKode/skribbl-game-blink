import { createMemo } from '@/app/utils/util';
import {
  ActionError,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
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
    const gameNumber = new URL(req.url).searchParams.get('gameNumber');
    const word = new URL(req.url).searchParams.get('word');
    if (!gameNumber || !word) {
      throw 'Game Number and word required';
    }
    const body: ActionPostRequest = await req.json();
    const data = body.data as {
      description?: string;
      hint?: string;
    };
    if (data.description === undefined || data.hint === undefined) {
      throw 'Description and hint required';
    }

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (error) {
      return Response.json(
        { message: 'Invalid Account', error },
        { headers: ACTIONS_CORS_HEADERS }
      );
    }
    const connection = new Connection(clusterApiUrl('devnet'));

    const TO_PUB_KEY = new PublicKey(process.env.PUBLIC_KEY!);

    const memo = JSON.stringify(
      await createMemo(gameNumber, data.hint, data.description, word)
    );

    // Check the size of the memo
    if (Buffer.byteLength(memo) > 566) {
      throw 'Memo exceeds 566 bytes limit';
    }

    const response = await fetch(
      new URL(
        `/api/game/${gameNumber}/upload-data`,
        new URL(req.url).origin
      ).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: data.description,
          hint: data.hint,
        }),
      }
    );

    if (!response.ok) {
      throw 'Unable to upload data';
    }

    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(memo, 'utf8'),
        keys: [{ pubkey: account, isSigner: true, isWritable: true }],
      }),

      SystemProgram.transfer({
        fromPubkey: account,
        toPubkey: TO_PUB_KEY,
        lamports: 0.00005 * LAMPORTS_PER_SOL,
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
        message: 'All the game Logic is added there',
        links: {
          next: {
            type: 'post',
            href: `/api/actions/publish-game/next-action?gameNumber=${gameNumber}`,
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
