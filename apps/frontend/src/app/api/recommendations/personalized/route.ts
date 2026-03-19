// app/api/recommendations/personalized/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0'; // ← НОВЫЙ параметр
    
    // 🔐 Проверяем токен авторизации
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Требуется авторизация для персональных рекомендаций'
        },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // 📡 Запрос к бэкенду с offset
    const backendUrl = `${apiUrl}/recommendations/personalized?limit=${limit}&offset=${offset}`;
    
    // ⚠️ Не кэшируем персонализированные ответы с разным offset!
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      // ❌ Не используем кэш Next.js для персонализированных данных
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Recommendations API error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.message || 'Failed to fetch recommendations' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
    
  } catch (error) {
    console.error('[GET /api/recommendations/personalized] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Не удалось загрузить рекомендации'
      },
      { status: 500 }
    );
  }
}