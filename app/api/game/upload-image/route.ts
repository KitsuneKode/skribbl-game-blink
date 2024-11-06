import { gameUtils } from '@/app/utils/util';

export async function POST(req: Request) {
  try {
    // Extract the gameNumber and image Blob from the request
    const formData = await req.formData();
    const gameNumber = Number(formData.get('gameNumber'));
    const imageBlob = formData.get('image') as Blob;

    // Upload the image to Firebase Storage
    const imageUrl = await gameUtils.uploadImage(gameNumber, imageBlob);

    return Response.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return Response.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
