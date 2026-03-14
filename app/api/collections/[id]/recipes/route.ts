import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ||
      req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipeId } = await req.json();
    if (!recipeId) return NextResponse.json({ error: 'recipeId required' }, { status: 400 });

    await connectDB();
    const rid = new mongoose.Types.ObjectId(recipeId);
    const col = await Collection.findOneAndUpdate(
      { _id: id, userId: payload.userId },
      { $addToSet: { recipes: rid } },
      { new: true }
    );
    if (!col) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    return NextResponse.json({ collection: col });
  } catch {
    return NextResponse.json({ error: 'Failed to add recipe' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ||
      req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipeId } = await req.json();
    await connectDB();
    await Collection.findOneAndUpdate(
      { _id: id, userId: payload.userId },
      { $pull: { recipes: new mongoose.Types.ObjectId(recipeId) } }
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to remove recipe' }, { status: 500 });
  }
}
