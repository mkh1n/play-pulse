import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const userCookie = request.cookies.get('user')?.value;

    console.log('Auth check:', {
      hasToken: !!token,
      hasUserCookie: !!userCookie
    });

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        token: null,
      });
    }

    // Пытаемся проверить токен на бэкенде
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const backendData = await response.json();
        
        // Если есть user в cookies - используем его
        let user = null;
        if (userCookie) {
          try {
            user = JSON.parse(userCookie);
          } catch (e) {
            console.error('Error parsing user cookie:', e);
          }
        }

        return NextResponse.json({
          authenticated: true,
          user: user || backendData.user,
          token: token,
        });
      }
    } catch (backendError) {
      console.log('Backend validation failed, using cookie fallback');
    }

    // Fallback: если есть user в cookies, считаем авторизованным
    if (userCookie) {
      try {
        const user = JSON.parse(userCookie);
        return NextResponse.json({
          authenticated: true,
          user: user,
          token: token,
        });
      } catch (e) {
        console.error('Error parsing user cookie:', e);
      }
    }

    // Ничего не найдено
    const res = NextResponse.json({
      authenticated: false,
      user: null,
      token: null,
    });
    
    // Очищаем невалидные cookies
    res.cookies.delete('token');
    res.cookies.delete('user');
    
    return res;

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      user: null,
      token: null,
      error: 'Internal server error',
    }, { status: 500 });
  }
}