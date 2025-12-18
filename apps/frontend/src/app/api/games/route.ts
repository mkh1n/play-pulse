// app/api/games/route.ts
import { NextRequest } from "next/server";

// URL вашего NestJS бэкенда
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Получаем параметры из запроса
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('pageSize') || '20';
  const ordering = searchParams.get('ordering') || '-rating';
  
  // Параметры фильтрации для игр
  const genresParam = searchParams.get('genres') || '';
  const platformsParam = searchParams.get('platforms') || '';
  const tagsParam = searchParams.get('tags') || '';
  const datesParam = searchParams.get('dates') || '';
  const developersParam = searchParams.get('developers') || '';
  const publishersParam = searchParams.get('publishers') || '';

  try {
    // Формируем URL для запроса к бэкенду
    const backendUrl = new URL(`${BACKEND_URL}/games`);
    
    // Базовые параметры
    backendUrl.searchParams.set('page', page);
    backendUrl.searchParams.set('pageSize', pageSize);
    backendUrl.searchParams.set('ordering', ordering);
    
    // Параметры поиска
    if (search) {
      backendUrl.searchParams.set('search', search);
    }
    
    // Параметры фильтрации
    if (genresParam) {
      backendUrl.searchParams.set('genres', genresParam);
    }
    
    if (platformsParam) {
      backendUrl.searchParams.set('platforms', platformsParam);
    }
    
    if (tagsParam) {
      backendUrl.searchParams.set('tags', tagsParam);
    }
    
    if (datesParam) {
      backendUrl.searchParams.set('dates', datesParam);
    }
    
    if (developersParam) {
      backendUrl.searchParams.set('developers', developersParam);
    }
    
    if (publishersParam) {
      backendUrl.searchParams.set('publishers', publishersParam);
    }
    
    console.log("Fetching games from backend:", backendUrl.toString());

    const res = await fetch(backendUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
        // Если ваш бэкенд требует аутентификацию, добавьте здесь
        // Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
      },
      next: { revalidate: 3600 }, // Кэшируем на 1 час
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend API error:", errorText);
      throw new Error(`Failed to fetch games from backend: ${res.status}`);
    }

    const data = await res.json();
    
    // Можно трансформировать данные здесь, если нужно
    // Например, добавить дополнительные поля или преобразовать формат
    
    return Response.json(data);
  } catch (error) {
    console.error("API Error:", error);
    
    // Возвращаем fallback данные в случае ошибки
    return Response.json(
      {
        count: 0,
        next: null,
        previous: null,
        results: [],
        error: "Failed to fetch games",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}