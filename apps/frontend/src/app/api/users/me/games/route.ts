import { cookies } from "next/headers";

const BACKEND_URL =
  process.env
    .NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001";

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
        `${BACKEND_URL}/users/me/games`,
        {
          method: "GET",

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
      "GET /users/me/games error:",
      error,
    );

    return Response.json(
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