import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// src/app/api/swipes/swipes/route.ts

// src/app/api/swipes/swipes/route.ts

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    const exclude = searchParams.get('exclude') || '';

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = new URL(`${apiUrl}/swipes/swipes`);
    backendUrl.searchParams.set('limit', limit);
    if (exclude) backendUrl.searchParams.set('exclude', exclude);

    // Таймаут 8 секунд (3 параллельных запроса по ~2-3 сек)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    console.log('[SWIPES ROUTE] Fetching:', backendUrl.toString());

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    console.log(`[SWIPES ROUTE] Got ${data.games?.length || 0} games`);

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[SWIPES ROUTE] Error:', error.message);

    // Если таймаут — возвращаем пустой массив, чтобы не ломать UI
    return NextResponse.json(
      {
        success: false,
        games: [],
        error: error.name === 'AbortError' ? 'Request timeout' : 'Internal server error',
      },
      { status: error.name === 'AbortError' ? 504 : 500 },
    );
  }
}