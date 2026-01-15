import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  try {
    // Проверяем токен на вашем бэкенде
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return NextResponse.json(
      { valid: response.ok },
      { status: response.status }
    );
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false },
      { status: 500 }
    );
  }
}