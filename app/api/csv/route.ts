import { storage } from "@/lib/firebase";
import { ref, getBytes } from "firebase/storage";
import { NextResponse } from "next/server";
import { FirebaseError } from 'firebase/app';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');
  const filename = searchParams.get('filename');

  if (!folder || !filename) {
    return new NextResponse('Missing folder or filename', { status: 400 });
  }

  try {
    const fileRef = ref(storage, `${folder}/${filename}`);
    const bytes = await getBytes(fileRef);
    const text = new TextDecoder().decode(bytes);

    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    const errorMessage = error instanceof FirebaseError 
      ? error.message 
      : 'Unknown error occurred';
    
    return new NextResponse(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 