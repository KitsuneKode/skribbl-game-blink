import { db, storage } from '@/lib/firebase/config';
import { Connection } from '@solana/web3.js';
import bcrypt from 'bcrypt';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const words = [
  // Animals
  'alligator',
  'antelope',
  'bear',
  'butterfly',
  'camel',
  'chicken',
  'dolphin',
  'eagle',
  'flamingo',
  'gorilla',
  'hedgehog',
  'kangaroo',
  'koala',
  'leopard',
  'lion',
  'monkey',
  'octopus',
  'panda',
  'penguin',
  'rhinoceros',
  'seal',
  'squirrel',
  'turtle',
  'unicorn',
  'wolf',

  // Food
  'avocado',
  'bacon',
  'bagel',
  'biscuit',
  'burger',
  'cheese',
  'cupcake',
  'donut',
  'fries',
  'grapes',
  'hamburger',
  'ice cream',
  'lasagna',
  'muffin',
  'noodles',
  'omelette',
  'pancake',
  'pizza',
  'popcorn',
  'ramen',
  'sandwich',
  'spaghetti',
  'strawberry',
  'sushi',
  'taco',

  // Objects
  'backpack',
  'balloon',
  'binoculars',
  'broom',
  'calculator',
  'camera',
  'clock',
  'compass',
  'flashlight',
  'glasses',
  'headphones',
  'helmet',
  'key',
  'ladder',
  'microscope',
  'paintbrush',
  'pencil',
  'refrigerator',
  'scissors',
  'stapler',
  'stove',
  'sunglasses',
  'thermometer',
  'vacuum',

  // Nature
  'avalanche',
  'beach',
  'blizzard',
  'canyon',
  'cloud',
  'desert',
  'earthquake',
  'forest',
  'geyser',
  'hill',
  'iceberg',
  'jungle',
  'lake',
  'lightning',
  'meadow',
  'mountain',
  'rainbow',
  'river',
  'sandstorm',
  'sunrise',
  'sunset',
  'tornado',
  'volcano',
  'waterfall',

  // Activities
  'archery',
  'ballet',
  'camping',
  'climbing',
  'cycling',
  'dancing',
  'fishing',
  'gardening',
  'hiking',
  'jogging',
  'knitting',
  'painting',
  'photography',
  'reading',
  'sculpting',
  'singing',
  'skateboarding',
  'skiing',
  'snowboarding',
  'surfing',
  'swimming',
  'tennis',
  'writing',

  // Miscellaneous
  'airplane',
  'anchor',
  'ballerina',
  'binoculars',
  'boomerang',
  'bubble',
  'caravan',
  'chimney',
  'diary',
  'elevator',
  'fence',
  'goblet',
  'hanger',
  'island',
  'jigsaw',
  'kaleidoscope',
  'lock',
  'mermaid',
  'nightmare',
  'ostrich',
  'parrot',
  'pillow',
  'robot',
  'sculpture',
  'telescope',
  'vampire',
  'wristwatch',
  'yoyo',
  'zeppelin',
];

export function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

export async function createMemo(
  gameNumber: number | string,
  hint: string,
  description: string,
  word: string
): Promise<{
  gameNumber: number | string;
  hint: string;
  description: string;
  word: string;
}> {
  const saltRound = 10;
  const hashedWord = await bcrypt.hash(word, saltRound);
  const hashedHint = await bcrypt.hash(hint, saltRound);

  const memo = {
    gameNumber,
    hint: hashedHint,
    description,
    word: hashedWord,
  };

  return memo;
}

export async function guessCheckFromMemo(
  guess: string,
  gameNumber: number | string,
  memo: {
    gameNumber: number | string;
    hint: string;
    description: string;
    word: string;
  }
): Promise<boolean> {
  console.log('inside the function');
  console.log('memo', memo);
  console.log('gameNumber', gameNumber);
  console.log('guess', guess);
  {
  }

  const guessMatch = await bcrypt.compare(guess, memo.word);
  const gameNumberMatch = Number(gameNumber) === Number(memo.gameNumber);

  console.log('gameNumber', gameNumber);
  console.log('guessMatch', guessMatch);
  return guessMatch && gameNumberMatch;
}

export async function getMemoFromTransaction(
  signature: string,
  connection: Connection
): Promise<{
  gameNumber: number;
  word: string;
  description: string;
  hint: string;
}> {
  // Replace 'any' with your expected memo object type
  try {
    const transaction = await connection.getParsedTransaction(
      signature,
      'confirmed'
    );

    if (transaction?.meta?.logMessages) {
      // Look for logs that start with 'Program log: Memo'
      const memoLog = transaction.meta.logMessages.find((log) =>
        log.startsWith('Program log: Memo')
      );

      if (memoLog) {
        // Adjust the replace to remove the prefix and extract the JSON portion
        const memo = memoLog.replace(/Program log: Memo \(len \d+\): /, '');
        const memoObject = JSON.parse(JSON.parse(memo));
        return memoObject;
      }
    }

    throw 'Memo not found in transaction';
  } catch (err) {
    console.error('Error getting memo from transaction:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unable to get memo from transaction');
  }
}

export const gameUtils = {
  // Create a new game with incremented game number
  createGame: async (): Promise<number> => {
    try {
      // Get the highest game number
      const gamesCol = collection(db, 'games');
      const q = query(gamesCol, orderBy('gameNumber', 'desc'), limit(1));
      const snapshot = await getDocs(q);

      // Calculate new game number
      const lastGameNumber = snapshot.empty
        ? 0
        : snapshot.docs[0].data().gameNumber;
      const newGameNumber = lastGameNumber + 1;

      // Create new game document
      await addDoc(gamesCol, {
        gameNumber: newGameNumber,
        imageUrl: '',
        timer: 120,
        description: '',
        hint: '',
        createdAt: new Date(),
      });

      return newGameNumber;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  },

  // Upload image for a specific game number
  uploadImage: async (
    gameNumber: number,
    imageData: Blob | Uint8Array | ArrayBuffer
  ): Promise<string> => {
    try {
      // First, find the game document
      const gamesCol = collection(db, 'games');
      const q = query(gamesCol, where('gameNumber', '==', gameNumber));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error(`Game number ${gameNumber} not found`);
      }

      const gameDoc = snapshot.docs[0];

      // Upload image to Storage
      const storageRef = ref(storage, `games/${gameNumber}/image.png`);
      await uploadBytes(storageRef, imageData);

      // Get the URL
      const imageUrl = await getDownloadURL(storageRef);

      // Update the game document with the image URL
      await updateDoc(doc(db, 'games', gameDoc.id), {
        imageUrl,
      });

      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },
  // Upload description and hint for a specific game number
  uploadGameDetails: async (
    gameNumber: number,
    description: string,
    hint: string
  ): Promise<{ status: string }> => {
    try {
      // First, find the game document
      const gamesCol = collection(db, 'games');
      const q = query(gamesCol, where('gameNumber', '==', gameNumber));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error(`Game number ${gameNumber} not found`);
      }

      const gameDoc = snapshot.docs[0];

      // Update the game document with the desctiption and hint
      await updateDoc(doc(db, 'games', gameDoc.id), {
        description,
        hint,
      });

      return { status: 'success' };
    } catch (error) {
      console.error('Error uploading data:', error);
      throw error;
    }
  },

  // Get image URL for a specific game number
  getImageUrl: async (gameNumber: number): Promise<string> => {
    try {
      const gamesCol = collection(db, 'games');
      const q = query(gamesCol, where('gameNumber', '==', gameNumber));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error(`Game number ${gameNumber} not found`);
      }

      return snapshot.docs[0].data().imageUrl;
    } catch (error) {
      console.error('Error getting image URL:', error);
      throw error;
    }
  },
  // Get description or hint for a specific game number
  getDetail: async (gameNumber: number, field: string): Promise<string> => {
    try {
      const gamesCol = collection(db, 'games');
      const q = query(gamesCol, where('gameNumber', '==', gameNumber));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error(`Game number ${gameNumber} not found`);
      }

      return snapshot.docs[0].data()[field];
    } catch (error) {
      console.error(`Error getting ${field}:`, error);
      throw error;
    }
  },
  // Update timer
  updateTimer: async (gameNumber: number, timer: number) => {
    try {
      const gamesCol = collection(db, 'games');
      const q = query(gamesCol, where('gameNumber', '==', gameNumber));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error(`Game number ${gameNumber} not found`);
      }

      const gameDoc = snapshot.docs[0];

      await updateDoc(doc(db, 'games', gameDoc.id), {
        timer,
      });
      return timer;
    } catch (error) {
      console.error('Error updating timer:', error);
      throw error;
    }
  },
  // Subscribe to session updates
  // subscribeToSession: (gameNumber: string, callback: (data: any) => void) => {
  //   const sessionRef = doc(db, 'game', gameNumber);
  //   return onSnapshot(sessionRef, (doc) => {
  //     if (doc.exists()) {
  //       callback(doc.data());
  //     }
  //   });
  // },
};

// const gameMemo = {
//   gameNumber: '13',
//   hint: '$2b$10$Cdug3WDMpeqZpRuS3lO9XOuLHcLhDGd4K9eVMRtqApVF1hXdUvZWK',
//   description:
//     'this is very interesting as it describes a man in the later age ',
//   word: '$2b$10$wL1TB.iGcJhUDMQ9gTmD7e4Uy0sZoItiaMImGLSWYgQOHVpyYWZHi',
// };

// const status = await guessCheckFromMemo('memo', 13, gameMemo);

// console.log('status', status);

// const gameSignature =
//   '5NEr6A7qjQeJKtf3hYG5APBS78oyrkz9Z3bywv4WspdqT88fEsaS2tNeEhmn5xmrsDBQCaCPUk32ZzeLvzuoJnXU';
// const connection = new Connection('https://api.devnet.solana.com');

// const gameMemo = await getMemoFromTransaction(gameSignature, connection);

// console.log(gameMemo);
// console.log(typeof gameMemo, 'out of call');

// // const gameObject = JSON.parse(JSON.parse(gameMemo));

// // console.log(typeof gameObject);

// console.log('word', gameMemo.word);
