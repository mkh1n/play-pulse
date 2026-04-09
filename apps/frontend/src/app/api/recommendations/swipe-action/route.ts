// app/api/recommendations/swipe-action/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, gameName, action } = body;
    
    // 🔐 Получаем токен из cookies
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Требуется авторизация'
        },
        { status: 401 }
      );
    }
    
    // 🔥 Валидация
    if (!gameId || !action || !['like', 'dislike', 'skip'].includes(action)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request',
          message: 'Некорректные данные запроса'
        },
        { status: 400 }
      );
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = `${apiUrl}/recommendations/swipe-action`;
    
    console.log(`[Swipe Action] Sending ${action} for game ${gameId}`);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        gameId,
        gameName: gameName || `Game ${gameId}`,
        action,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Swipe Action] Backend error:', data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.message || 'Failed to process swipe action',
          details: data
        },
        { status: response.status }
      );
    }
    
    console.log(`[Swipe Action] Success: ${action} processed for game ${gameId}`);
    
    return NextResponse.json(data, { status: 200 });
    
  } catch (error: any) {
    console.error('[Swipe Action] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error.message || 'Ошибка обработки действия'
      },
      { status: 500 }
    );
  }
}   