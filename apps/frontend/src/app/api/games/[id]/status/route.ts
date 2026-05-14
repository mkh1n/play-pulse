import {
  NextRequest,
  NextResponse,
} from "next/server";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } =
      await context.params;

    const token =
      request.cookies.get(
        "token",
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const apiUrl =
      process.env
        .NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    const response =
      await fetch(
        `${apiUrl}/games/${id}/status`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(body),
        },
      );

    const data =
      await response.json();

    return NextResponse.json(
      data,
      {
        status:
          response.status,
      },
    );
  } catch (error) {
    console.error(
      "Status update error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}