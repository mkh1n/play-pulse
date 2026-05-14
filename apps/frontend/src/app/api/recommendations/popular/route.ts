// src/app/api/recommendations/popular/route.ts

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = new URL(`${apiUrl}/recommendations/popular`);
    backendUrl.searchParams.set('limit', limit);

    console.log(`[POPULAR ROUTE] Fetching: ${backendUrl.toString()}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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

    console.log(`[POPULAR ROUTE] Got ${data.games?.length || 0} popular games`);

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[POPULAR ROUTE] Error:', error.message);

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