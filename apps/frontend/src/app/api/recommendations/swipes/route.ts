// app/api/recommendations/swipes/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const exclude = searchParams.get('exclude') || '';
    
    // 🔐 Получаем токен из cookies
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Требуется авторизация для свайпов'
        },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // 📡 Формируем запрос к бэкенду
    const backendUrl = new URL(`${apiUrl}/recommendations/swipes`);
    backendUrl.searchParams.set('limit', limit);
    backendUrl.searchParams.set('offset', offset);
    if (exclude) {
      backendUrl.searchParams.set('exclude', exclude);
    }
    
    console.log('[Swipes API] Fetching from:', backendUrl.toString());
    
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // 🔥 Не кэшируем персонализированные данные
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Swipes API] Backend error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.message || 'Failed to fetch swipes',
          details: data
        },
        { status: response.status }
      );
    }

    console.log(`[Swipes API] Success: ${data.count} games returned`);
    
    return NextResponse.json(data, { status: 200 });
    
  } catch (error: any) {
    console.error('[Swipes API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error.message || 'Не удалось загрузить игры для свайпов'
      },
      { status: 500 }
    );
  }
}