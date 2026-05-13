import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get("token")
        ?.value;

    if (!token) {
      return Response.json(
        {
          success: false,
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const response =
      await fetch(
        "http://localhost:3001/preferences/game-actions",
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

    return Response.json(
      data,
      {
        status:
          response.status,
      },
    );
  } catch (error) {
    console.error(
      "Game actions route error:",
      error,
    );

    return Response.json(
      {
        success: false,
        error:
          "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}