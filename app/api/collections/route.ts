import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ||
      req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const q = Collection.find({ userId: payload.userId, name: { $ne: 'Favorites' } }).sort({ createdAt: 1 });
    if (req.nextUrl.searchParams.get('populate') === '1') {
      q.populate('recipes', '_id title');
    }
    const collections = await q.lean();
    return NextResponse.json({ collections });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ||
      req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, emoji } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (name.trim().toLowerCase() === 'favorites') {
      return NextResponse.json({ error: 'Favorites is already a separate section' }, { status: 400 });
    }

    await connectDB();
    const collection = await Collection.create({ userId: payload.userId, name: name.trim(), emoji: emoji || '📁', recipes: [] });
    return NextResponse.json({ collection }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  }
}
