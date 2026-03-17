import { NextResponse } from "next/server";
import { PARENT_PLATFORMS_FOR_UI } from "../../../../lib/platforms"

export async function GET() {
  return NextResponse.json(PARENT_PLATFORMS_FOR_UI);
}