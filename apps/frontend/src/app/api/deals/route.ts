import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return Response.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://plati.io/api/search.ashx?query=${encodeURIComponent(query)}&response=json`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YourApp/1.0; +https://yourdomain.com)',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch deals' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Deals API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}