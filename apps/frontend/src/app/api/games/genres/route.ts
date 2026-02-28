import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching genres from backend:", `${BACKEND_URL}/games/metadata/genres`);
    
    const response = await fetch(`${BACKEND_URL}/games/metadata/genres`, {
      headers: {
        "Content-Type": "application/json",
      },
      // Кэшируем на 24 часа, так как жанры редко меняются
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend API error:", errorText);
      throw new Error(`Failed to fetch genres: ${response.status}`);
    }

    const data = await response.json();
    
    // Можно трансформировать данные здесь
    // Например, добавить русские названия или отсортировать
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Error:", error);
    
    // Fallback данные на случай ошибки
    return NextResponse.json([
      { id: 4, name: 'Action' },
      { id: 51, name: 'Indie' },
      { id: 3, name: 'Adventure' },
      { id: 5, name: 'RPG' },
      { id: 10, name: 'Strategy' },
      { id: 2, name: 'Shooter' },
      { id: 40, name: 'Casual' },
      { id: 14, name: 'Simulation' },
      { id: 7, name: 'Puzzle' },
      { id: 11, name: 'Arcade' },
      { id: 83, name: 'Platformer' },
      { id: 1, name: 'Racing' },
      { id: 59, name: 'Massively Multiplayer' },
      { id: 15, name: 'Sports' },
      { id: 6, name: 'Fighting' },
      { id: 19, name: 'Family' },
      { id: 28, name: 'Board Games' },
      { id: 34, name: 'Educational' },
      { id: 17, name: 'Card' },
    ]);
  }
}