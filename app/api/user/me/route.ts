import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, signToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const user = await User.findById(payload.userId).select('_id email username createdAt').lean() as {
      _id: unknown; email: string; username?: string; createdAt: Date
    } | null;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const token = signToken({ userId: payload.userId, email: payload.email });

    return NextResponse.json({
      user: {
        _id: (user._id as { toString(): string }).toString(),
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}
