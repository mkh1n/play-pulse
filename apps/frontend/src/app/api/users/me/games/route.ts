import {
  cookies,
} from "next/headers";

import {
  NextResponse,
} from "next/server";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        "token",
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 401,
        },
      );
    }

    const apiUrl =
      process.env
        .NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    const response =
      await fetch(
        `${apiUrl}/users/me/games`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },

          cache:
            "no-store",
        },
      );

    const data =
      await response.json();

    return NextResponse.json(
      data,
    );
  } catch (error) {
    console.error(
      "Error fetching user games:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        games: [],
      },
      {
        status: 500,
      },
    );
  }
}