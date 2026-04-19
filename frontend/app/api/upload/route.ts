import { NextResponse } from 'next/server';

/**
 * This route is no longer used.
 * Uploads now go: Browser → GET /api/backend/files/upload-url → PUT directly to R2.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'This upload proxy is no longer active. The client should PUT directly to R2.' },
    { status: 410 },
  );
}
