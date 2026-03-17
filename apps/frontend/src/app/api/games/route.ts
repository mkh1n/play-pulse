// app/api/games/route.ts

import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search");
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("pageSize") || "20";
  const ordering = searchParams.get("ordering") || "-rating";

  // универсальный парсер
  const parseParam = (key: string) => {
    const multi = searchParams.getAll(key);
    if (multi.length > 1) return multi.join(",");

    const single = searchParams.get(key);
    if (!single) return null;

    return single;
  };

  const genres = parseParam("genres");
  const platforms = parseParam("platforms");
  const tags = parseParam("tags");
  const dates = parseParam("dates");
  const developers = parseParam("developers");
  const publishers = parseParam("publishers");

  try {
    const backendUrl = new URL(`${BACKEND_URL}/games`);

    backendUrl.searchParams.set("page", page);
    backendUrl.searchParams.set("pageSize", pageSize);
    backendUrl.searchParams.set("ordering", ordering);

    if (search) backendUrl.searchParams.set("search", search);

    if (genres) backendUrl.searchParams.set("genres", genres);
    if (platforms) backendUrl.searchParams.set("platforms", platforms);
    if (tags) backendUrl.searchParams.set("tags", tags);
    if (dates) backendUrl.searchParams.set("dates", dates);
    if (developers) backendUrl.searchParams.set("developers", developers);
    if (publishers) backendUrl.searchParams.set("publishers", publishers);

    console.log("Fetching games from backend:", backendUrl.toString());

    const res = await fetch(backendUrl.toString(), {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Backend API error:", errorText);
      throw new Error(`Failed to fetch games: ${res.status}`);
    }

    const data = await res.json();

    return Response.json(data);
  } catch (error) {
    console.error("API Error:", error);

    return Response.json(
      {
        count: 0,
        next: null,
        previous: null,
        results: [],
        error: "Failed to fetch games",
      },
      { status: 500 }
    );
  }
}