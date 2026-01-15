import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRateRequest(request, params, 'POST');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleRateRequest(request, params, 'DELETE');
}

async function handleRateRequest(
  request: NextRequest,
  paramsPromise: Promise<{ id: string }>,
  method: 'POST' | 'DELETE'
) {
  try {
    const token = request.cookies.get('token')?.value;
    const { id } = await paramsPromise;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    let url = `${apiUrl}/games/${id}/rate`;
    
    // Для DELETE запроса тело не нужно
    const requestOptions: RequestInit = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST') {
      const body = await request.json();
      const { rating } = body;

      if (!rating || rating < 1 || rating > 10) {
        return NextResponse.json(
          { error: 'Invalid rating. Must be between 1 and 10' },
          { status: 400 }
        );
      }

      requestOptions.body = JSON.stringify({ rating });
    } else {
      // Для DELETE используем endpoint /unrate если он есть
      // Или DELETE на /rate если ваш бэкенд поддерживает
      url = `${apiUrl}/games/${id}/rate`; // Или ${apiUrl}/games/${id}/unrate
    }

    const backendResponse = await fetch(url, requestOptions);
    const data = await backendResponse.json();
    
    return NextResponse.json(data, { 
      status: backendResponse.status 
    });
  } catch (error) {
    console.error(`${method} rate error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}