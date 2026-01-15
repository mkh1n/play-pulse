import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const user = request.cookies.get('user')?.value;
  
  return NextResponse.json({
    token: token ? 'present' : 'missing',
    user: user ? JSON.parse(user) : null,
    cookies: request.cookies.getAll(),
  });
}