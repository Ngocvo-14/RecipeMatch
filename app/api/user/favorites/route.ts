import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Favorite from '@/models/Favorite';
import Recipe from '@/models/Recipe';
import { getUserFromRequest } from '@/lib/auth';
import { getFoodImageUrl } from '@/lib/foodImage';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function sanitizeImageUrl(imageUrl: unknown, title: string, ingredients?: string[]): string {
  const img = typeof imageUrl === 'string' ? imageUrl : '';
  const bad = !img || img.trim() === '' ||
    img.includes('picsum') ||
    img.includes('loremflickr') ||
    img.includes('X-Amz-Signature') ||
    img.includes('xqwwpy') || img.includes('xoqwpt') || img.includes('ysxwuq') ||
    /unsplash\.com/i.test(img) ||
    /edamam-product-images\.s3\.amazonaws\.com/i.test(img);
  return bad ? getFoodImageUrl(title, ingredients) : img;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    // Step 1: fetch raw favorite records (recipeId as ObjectId)
    const favRaw = await Favorite.find({ userId: user.userId })
      .sort({ savedAt: -1 })
      .lean();

    if (favRaw.length === 0) return NextResponse.json({ favorites: [] });

    // Step 2: explicit recipe lookup — always gets current imageUrl from recipes collection
    const recipeIds = favRaw
      .map((f) => {
        try { return new mongoose.Types.ObjectId(f.recipeId.toString()); }
        catch { return null; }
      })
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const recipes = await Recipe.find({ _id: { $in: recipeIds } }).lean();
    const recipeMap = new Map(recipes.map((r) => [r._id.toString(), r]));

    // Step 3: merge favorite + live recipe data, sanitizing imageUrl
    const enriched = favRaw.map((f) => {
      const recipeDoc = recipeMap.get(f.recipeId?.toString());
      if (!recipeDoc) return null;
      const ingredients = (recipeDoc.ingredients ?? []).map((i) =>
        typeof i === 'string' ? i : (i as { name?: string }).name ?? ''
      );
      return {
        _id: f._id,
        savedAt: f.savedAt,
        recipeId: {
          ...recipeDoc,
          imageUrl: sanitizeImageUrl(recipeDoc.imageUrl, recipeDoc.title, ingredients),
        },
      };
    }).filter(Boolean);

    return NextResponse.json({ favorites: enriched });
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
