// src/app/api/swipes/similar/[gameId]/route.ts

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  console.log('[SIMILAR ROUTE] === START ===');
  
  try {
    const { gameId } = await params;
    console.log('[SIMILAR ROUTE] gameId:', gameId);

    const token = request.cookies.get('token')?.value;
    console.log('[SIMILAR ROUTE] token exists:', !!token);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = new URL(`${apiUrl}/swipes/similar/${gameId}`);
    backendUrl.searchParams.set('limit', limit);

    console.log('[SIMILAR ROUTE] Fetching backend:', backendUrl.toString());

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();
    console.log('[SIMILAR ROUTE] Backend response:', data.success, 'games:', data.games?.length);

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[SIMILAR ROUTE] Error:', error.message);
    return NextResponse.json(
      { success: false, games: [], error: error.message },
      { status: 500 },
    );
  }
}