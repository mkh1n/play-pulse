// app/api/games/route.ts

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  "http://localhost:3001";

export const dynamic = "force-dynamic";

export const revalidate = 0;

export async function GET(
  request: NextRequest,
) {
  try {
    const { searchParams } = new URL(
      request.url,
    );

    const backendUrl = new URL(
      `${BACKEND_URL}/games`,
    );

    searchParams.forEach(
      (value, key) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          backendUrl.searchParams.set(
            key,
            value,
          );
        }
      },
    );

    console.log(
      "[API/GAMES] Forwarding:",
      backendUrl.toString(),
    );

    const response = await fetch(
      backendUrl.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
      },
    );

    const text =
      await response.text();

    if (!response.ok) {
      console.error(
        "[API/GAMES] Backend error:",
        text,
      );

      return NextResponse.json(
        {
          count: 0,
          next: null,
          previous: null,
          results: [],
          error:
            "Backend fetch failed",
        },
        {
          status:
            response.status,
        },
      );
    }

    return new NextResponse(text, {
      status: 200,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error(
      "[API/GAMES] Fatal error:",
      error,
    );

    return NextResponse.json(
      {
        count: 0,
        next: null,
        previous: null,
        results: [],
        error:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
