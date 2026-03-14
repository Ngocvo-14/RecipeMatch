import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import History from '@/models/History';
import { getUserFromRequest } from '@/lib/auth';

// DELETE /api/user/history/[recipeId] — remove a single history entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { recipeId } = await params;
    await connectDB();
    await History.deleteOne({ userId: user.userId, recipeId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('History delete error:', error);
    return NextResponse.json({ error: 'Failed to remove entry' }, { status: 500 });
  }
}
