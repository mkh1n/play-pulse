import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { actions } = body;

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: expected array of actions' },
        { status: 400 },
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const results = [];
    
    for (const action of actions) {
      const { gameId, gameName, action: actionType } = action;

      if (!gameId || !actionType) {
        results.push({
          gameId,
          success: false,
          error: 'Invalid action data',
        });
        continue;
      }

      try {
        const endpoint = actionType === 'like' 
          ? `/games/${gameId}/like`
          : `/games/${gameId}/dislike`;

        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to process ${actionType}`);
        }

        results.push({
          gameId,
          action: actionType,
          success: true,
        });
      } catch (error: any) {
        console.error(`[BATCH] Error processing game ${gameId}:`, error.message);
        results.push({
          gameId,
          action: actionType,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('[BATCH SWIPE ACTION]', error);

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
