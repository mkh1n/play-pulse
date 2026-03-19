// app/api/recommendations/similar/[gameId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    
    // 🔐 Токен опционален
    const token = request.cookies.get('token')?.value;
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = `${apiUrl}/recommendations/similar/${gameId}?limit=${limit}`;
    
    console.log(`[Proxy] Fetching similar games: ${backendUrl}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      next: { revalidate: 1800 }, // Кэш на 30 минут
    });

    // 🔍 Проверяем Content-Type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const errorText = await response.text();
      console.error(`[Proxy] Backend returned non-JSON (${contentType}):`, errorText.substring(0, 300));
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Backend returned invalid response',
          debug: { status: response.status, contentType, bodyPreview: errorText.substring(0, 200) }
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.message || 'Backend error' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('[GET /api/recommendations/similar/[gameId]] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}