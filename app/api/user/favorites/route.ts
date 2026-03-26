import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Favorite from '@/models/Favorite';
import '@/models/Recipe'; // ensure Recipe model is registered for populate
import { getUserFromRequest } from '@/lib/auth';
import { getFoodImageUrl } from '@/lib/foodImage';

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
    const favorites = await Favorite.find({ userId: user.userId })
      .populate('recipeId')
      .sort({ savedAt: -1 })
      .lean();

    const enriched = favorites.map((f) => {
      const recipe = f.recipeId as Record<string, unknown> | null;
      if (!recipe) return f;
      const ingredients = ((recipe.ingredients ?? []) as unknown[]).map((i) =>
        typeof i === 'string' ? i : ((i as Record<string, string>).name ?? '')
      );
      return {
        ...f,
        recipeId: {
          ...recipe,
          imageUrl: sanitizeImageUrl(recipe.imageUrl, recipe.title as string ?? '', ingredients),
        },
      };
    });

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
