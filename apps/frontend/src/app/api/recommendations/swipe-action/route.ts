import {
  NextRequest,
  NextResponse,
} from 'next/server';

export const dynamic =
  'force-dynamic';

export async function POST(
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

    const body =
      await request.json();

    const {
      gameId,
      gameName,
      action,
    } = body;

    if (
      !gameId ||
      !action
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid payload',
        },
        { status: 400 },
      );
    }

    const apiUrl =
      process.env
        .NEXT_PUBLIC_API_URL ||
      'http://localhost:3001';

    const response =
      await fetch(
        `${apiUrl}/recommendations/swipe-action`,
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,

            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            {
              gameId,

              gameName,

              action,
            },
          ),
        },
      );

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
      '[SWIPE ACTION]',
      error,
    );

    return NextResponse.json(
      {
        success: false,

        error:
          'Internal server error',
      },
      { status: 500 },
    );
  }
}
