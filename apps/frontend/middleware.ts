import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  console.log('Middleware:', {
    pathname,
    hasToken: !!token,
    token: token ? 'present' : 'missing'
  });

  // Защищенные маршруты (только страницы)
  const protectedPages = ['/profile'];
  
  // Проверяем защищенные страницы
  const isProtectedPage = protectedPages.some(route => 
    pathname.startsWith(route)
  );

  // Если это защищенная страница и нет токена - редирект на авторизацию
  if (isProtectedPage && !token) {
    console.log('Redirecting to auth from:', pathname);
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Middleware применяется только к защищенным страницам
export const config = {
  matcher: [
    '/profile/:path*',
  ],
};