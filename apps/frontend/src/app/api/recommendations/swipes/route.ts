import {
  NextRequest,
  NextResponse,
} from 'next/server';

export const dynamic =
  'force-dynamic';

export const revalidate = 0;

export async function GET(
  request: NextRequest,
) {
  try {
    const token =
      request.cookies.get(
        'token',
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized',
        },
        { status: 401 },
      );
    }

    const {
      searchParams,
    } = new URL(
      request.url,
    );

    // Уменьшаем limit по умолчанию для скорости
    const limit =
      searchParams.get(
        'limit',
      ) || '10';

    const exclude =
      searchParams.get(
        'exclude',
      ) || '';

    const apiUrl =
      process.env
        .NEXT_PUBLIC_API_URL ||
      'http://localhost:3001';

    const backendUrl =
      new URL(
        `${apiUrl}/recommendations/swipes`,
      );

    backendUrl.searchParams.set(
      'limit',
      limit,
    );

    if (exclude) {
      backendUrl.searchParams.set(
        'exclude',
        exclude,
      );
    }

    // Добавляем timeout чтобы не ждать вечно
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response =
      await fetch(
        backendUrl.toString(),
        {
          method: 'GET',

          headers: {
            Authorization: `Bearer ${token}`,
          },

          cache:
            'no-store',
          
          signal: controller.signal,
        },
      );

    clearTimeout(timeoutId);

    const data =
      await response.json();

    return NextResponse.json(
      data,
      {
        status:
          response.status,
      },
    );
  } catch (error: any) {
    console.error(
      '[SWIPES ROUTE]',
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error.name === 'AbortError' 
            ? 'Request timeout' 
            : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
