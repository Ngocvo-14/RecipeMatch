import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import History from '@/models/History';
import { getUserFromRequest } from '@/lib/auth';

// GET /api/user/history — returns viewed recipes sorted by most recent
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const history = await History.find({ userId: user.userId })
      .populate('recipeId')
      .sort({ viewedAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ history });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

// POST /api/user/history — upsert a view (update viewedAt if already exists)
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { recipeId } = await req.json();
    if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 });

    await connectDB();
    await History.findOneAndUpdate(
      { userId: user.userId, recipeId },
      { $set: { viewedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('History upsert error:', error);
    return NextResponse.json({ error: 'Failed to track history' }, { status: 500 });
  }
}

// DELETE /api/user/history — clear entire history
export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    await History.deleteMany({ userId: user.userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('History clear error:', error);
    return NextResponse.json({ error: 'Failed to clear history' }, { status: 500 });
  }
}
