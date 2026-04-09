// app/api/news/rss/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchRssFeed, RssItem, DEFAULT_SOURCES } from './utils';

// 🔥 УБРАЛИ: export const runtime = 'edge';
// Теперь работает в стандартном Node.js runtime

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 минут кэш

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor((i * 9301 + 49297) % 233280 / 233280 * (i + 1)); // стабильнее random
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sources = body.sources || [];

    if (!sources.length) {
      return NextResponse.json({ success: true, items: [] });
    }

    const fetchPromises = sources.map((source: any) =>
      fetchRssFeed(source.url, source.name)
        .then(items =>
          items.map(item => ({
            ...item,
            source: source.name,
            sourceUrl: source.url,
            category: source.category,
          }))
        )
        .catch(() => [])
    );

    const results = await Promise.all(fetchPromises);

    let allItems = results.flat();

    allItems = allItems
      .filter(item => item.title && item.link)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    return NextResponse.json({
      success: true,
      items: allItems,
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourcesParam = searchParams.get('sources');
    const limit = parseInt(searchParams.get('limit') || '50');

    const requestedSources = sourcesParam
      ? sourcesParam.split(',').map(id => id.trim()).filter(Boolean)
      : DEFAULT_SOURCES.filter(s => s.isEnabled).map(s => s.id);

    if (requestedSources.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        items: [],
        message: 'No sources enabled',
      });
    }

    const sources = DEFAULT_SOURCES.filter(s => requestedSources.includes(s.id));

    if (sources.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid sources found',
        requested: requestedSources,
        available: DEFAULT_SOURCES.map(s => s.id),
      }, { status: 400 });
    }

    // 🔥 Параллельный фетчинг с обработкой ошибок для каждого источника
    const fetchPromises = sources.map(source =>
      fetchRssFeed(source.url, source.name)
        .then(items => items.map(item => ({
          ...item,
          source: source.name,
          sourceUrl: source.url,
          category: source.category
        })))
        .catch(err => {
          console.warn(`[RSS API] Source ${source.name} failed:`, err.message);
          return [];
        })
    );

    const results = await Promise.all(fetchPromises);
    let allItems: RssItem[] = results.flat();

    // Фильтрация и сортировка
    allItems = allItems
      .filter(item => item.title && item.link)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    // 🔥 shuffle один раз на сервере
    allItems = shuffleArray(allItems);
    const limitedItems = allItems.slice(0, limit);

    return NextResponse.json({
      success: true,
      count: limitedItems.length,
      totalAvailable: allItems.length,
      sources: sources.map(s => s.name),
      items: limitedItems,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[RSS API] Critical error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch RSS feeds',
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}