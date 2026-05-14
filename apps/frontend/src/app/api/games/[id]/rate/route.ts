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
  return handleRequest(
    request,
    context.params,
    "POST",
  );
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  return handleRequest(
    request,
    context.params,
    "DELETE",
  );
}

async function handleRequest(
  request: NextRequest,
  paramsPromise: Promise<{
    id: string;
  }>,
  method:
    | "POST"
    | "DELETE",
) {
  try {
    const { id } =
      await paramsPromise;

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

    const apiUrl =
      process.env
        .NEXT_PUBLIC_API_URL ||
      "http://localhost:3001";

    const requestOptions: RequestInit =
      {
        method,

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/json",
        },
      };

    if (method === "POST") {
      const body =
        await request.json();

      requestOptions.body =
        JSON.stringify(body);
    }

    const response =
      await fetch(
        `${apiUrl}/games/${id}/rate`,
        requestOptions,
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
      `${method} rate error:`,
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