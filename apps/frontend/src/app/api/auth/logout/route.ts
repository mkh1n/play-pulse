import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const res = NextResponse.json({ success: true });
    
    // Очищаем cookies
    res.cookies.delete('token');
    res.cookies.delete('user');
    
    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}