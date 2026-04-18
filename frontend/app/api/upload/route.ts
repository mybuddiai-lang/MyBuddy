import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request — expected multipart/form-data' }, { status: 400 });
  }

  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const file = fileEntry;
  const type = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('audio/') ? 'VOICE' : 'FILE';

  try {
    const blob = await put(file.name, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    });
    return NextResponse.json({ url: blob.url, type });
  } catch (err: any) {
    console.error('[/api/upload] Vercel Blob error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 });
  }
}
