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
        `${BACKEND_URL}/users/me`,
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
      "GET /users/me error:",
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

export async function PUT(
  request: Request,
) {
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

    const body =
      await request.json();

    const response =
      await fetch(
        `${BACKEND_URL}/users/me`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(
            body,
          ),
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
      "PUT /users/me error:",
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