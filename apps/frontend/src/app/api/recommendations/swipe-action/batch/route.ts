import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export async function POST(
  request: NextRequest,
) {
  try {
    const token =
      request.cookies.get(
        "token",
      )?.value;

    if (!token) {
      return NextResponse.json(
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

    const body =
      await request.json();

    const { actions } = body;

    if (
      !actions ||
      !Array.isArray(actions)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid actions payload",
        },
        {
          status: 400,
        },
      );
    }

    const apiUrl =
      process.env
        .NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    const results = [];

    for (const item of actions) {
      try {
        const {
          gameId,
          gameName,
          gameImage,
          action,
        } = item;

        if (
          !gameId ||
          !action
        ) {
          results.push({
            gameId,
            success: false,
            error:
              "Invalid action",
          });

          continue;
        }

        const endpoint =
          action === "like"
            ? "like"
            : "dislike";

        const response =
          await fetch(
            `${apiUrl}/games/${gameId}/${endpoint}`,
            {
              method: "POST",

              headers: {
                Authorization: `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  gameName,
                  gameImage,
                },
              ),
            },
          );

        const data =
          await response.json();

        results.push({
          gameId,
          action,
          success:
            response.ok,
          data,
        });
      } catch (error: any) {
        console.error(
          "[BATCH ITEM ERROR]",
          error,
        );

        results.push({
          success: false,
          error:
            error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error(
      "[BATCH ROUTE ERROR]",
      error,
    );

    return NextResponse.json(
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