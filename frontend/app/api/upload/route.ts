import { NextResponse } from 'next/server';

// File uploads go browser-direct to Cloudflare R2 via pre-signed URLs generated
// by the backend. This route is no longer used.
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is not active. Uploads go directly to R2.' },
    { status: 404 },
  );
}
