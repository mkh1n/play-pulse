// app/api/recommendations/popular/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0'; // ← Поддержка offset для консистентности
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // 📡 Запрос к бэкенду
    const backendUrl = `${apiUrl}/recommendations/popular?limit=${limit}&offset=${offset}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // 🔄 Кэшируем на 1 час (популярные игры меняются редко)
      next: { revalidate: 3600 },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Popular games API error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.message || 'Failed to fetch popular games' 
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
    
  } catch (error) {
    console.error('[GET /api/recommendations/popular] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'Не удалось загрузить популярные игры'
      },
      { status: 500 }
    );
  }
}