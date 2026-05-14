import { cookies }
from "next/headers";

const BACKEND_URL =
  process.env
    .NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3001";

export async function PUT(
  request: Request,
) {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get("token")
        ?.value;

    const body =
      await request.json();

    const response =
      await fetch(
        `${BACKEND_URL}/users/me/profile`,
        {
          method: "PUT",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
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
    console.error(error);

    return Response.json(
      {
        success: false,
      },
      {
        status: 500,
      },
    );
  }
}