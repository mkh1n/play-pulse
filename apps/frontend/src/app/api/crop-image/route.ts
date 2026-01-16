// src/app/api/crop-image/route.ts
import { NextRequest } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url || !url.startsWith('https://graph.digiseller.com/')) {
    return new Response('Invalid URL', { status: 400 });
  }

  try {
    const imageRes = await fetch(url);
    if (!imageRes.ok) throw new Error('Failed to fetch');

    const buffer = await imageRes.arrayBuffer();
    const img = sharp(Buffer.from(buffer));

    // Авто-обрезка прозрачных/белых краёв
    const trimmed = await img
      .trim({ threshold: 10 }) // убирает однородные края
      .toBuffer();

    return new Response(Uint8Array.from(trimmed), {
  headers: { 'Content-Type': 'image/png' },
});
  } catch (e) {
    console.error('Crop error:', e);
    // Возвращаем оригинал, если не получилось
    return fetch(url);
  }
}