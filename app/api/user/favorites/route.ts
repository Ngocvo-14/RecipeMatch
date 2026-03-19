import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Favorite from '@/models/Favorite';
import '@/models/Recipe'; // ensure Recipe model is registered for populate
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const favorites = await Favorite.find({ userId: user.userId })
      .populate('recipeId')
      .sort({ savedAt: -1 })
      .lean();

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { recipeId } = await req.json();
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID required' }, { status: 400 });
    }

    await connectDB();

    const existing = await Favorite.findOne({ userId: user.userId, recipeId });
    if (existing) {
      return NextResponse.json({ message: 'Already saved', favorited: true });
    }

    await Favorite.create({ userId: user.userId, recipeId, savedAt: new Date() });
    return NextResponse.json({ message: 'Recipe saved', favorited: true });
  } catch (error) {
    console.error('Save favorite error:', error);
    return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { recipeId } = await req.json();
    await connectDB();
    await Favorite.deleteOne({ userId: user.userId, recipeId });
    return NextResponse.json({ message: 'Recipe removed from favorites', favorited: false });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return NextResponse.json({ error: 'Failed to remove recipe' }, { status: 500 });
  }
}
