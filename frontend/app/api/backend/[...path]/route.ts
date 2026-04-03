import { NextRequest, NextResponse } from 'next/server';

// BACKEND_API_URL is a server-only var — read from process.env at runtime (not inlined at build time like NEXT_PUBLIC_* vars)
const BACKEND = process.env.BACKEND_API_URL || 'http://localhost:3001/api';

const SKIP_HEADERS = new Set(['host', 'connection', 'transfer-encoding', 'keep-alive']);

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const targetUrl = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  try {
    const body = hasBody ? await req.arrayBuffer() : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body ?? undefined,
      redirect: 'manual', // forward redirects to browser (required for Google OAuth)
    });

    // Forward 3xx redirects directly to the browser
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) return NextResponse.redirect(location, { status: response.status });
    }

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!SKIP_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[proxy] Backend unreachable at ${targetUrl}:`, err);
    return NextResponse.json(
      { success: false, message: 'Backend service unavailable' },
      { status: 503 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
