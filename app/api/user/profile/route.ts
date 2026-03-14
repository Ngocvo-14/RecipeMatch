import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { username } = await req.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 });
    }
    if (/\s/.test(trimmed)) {
      return NextResponse.json({ error: 'Username cannot contain spaces' }, { status: 400 });
    }

    await connectDB();

    const taken = await User.findOne({ username: trimmed, _id: { $ne: payload.userId } });
    if (taken) return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });

    const user = await User.findByIdAndUpdate(
      payload.userId,
      { $set: { username: trimmed } },
      { new: true }
    ).select('_id email username createdAt').lean() as {
      _id: unknown; email: string; username: string; createdAt: Date
    } | null;

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      user: {
        _id: (user._id as { toString(): string }).toString(),
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
