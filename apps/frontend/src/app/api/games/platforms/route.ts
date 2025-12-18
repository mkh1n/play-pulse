import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching platforms from backend:", `${BACKEND_URL}/games/metadata/platforms`);
    
    const response = await fetch(`${BACKEND_URL}/games/metadata/platforms`, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend API error:", errorText);
      throw new Error(`Failed to fetch platforms: ${response.status}`);
    }

    const data = await response.json();
    
    // Фильтруем только актуальные платформы (например, без старых консолей)
    const filteredPlatforms = data.filter((platform: any) => {
      // Можно добавить логику фильтрации
      return true;
    });
    
    return NextResponse.json(filteredPlatforms);
  } catch (error) {
    console.error("API Error:", error);
    
    // Fallback данные
    return NextResponse.json([
      { id: 4, name: 'PC' },
      { id: 187, name: 'PlayStation 5' },
      { id: 18, name: 'PlayStation 4' },
      { id: 1, name: 'Xbox One' },
      { id: 186, name: 'Xbox Series S/X' },
      { id: 7, name: 'Nintendo Switch' },
      { id: 3, name: 'iOS' },
      { id: 21, name: 'Android' },
      { id: 5, name: 'macOS' },
      { id: 6, name: 'Linux' },
    ]);
  }
}