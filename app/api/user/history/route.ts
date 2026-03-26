import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import History from '@/models/History';
import Recipe from '@/models/Recipe';
import { getUserFromRequest } from '@/lib/auth';
import { getFoodImageUrl } from '@/lib/foodImage';
import mongoose from 'mongoose';

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

// GET /api/user/history — returns viewed recipes sorted by most recent
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();

    // Step 1: fetch raw history records (recipeId as ObjectId)
    const historyRaw = await History.find({ userId: user.userId })
      .sort({ viewedAt: -1 })
      .limit(100)
      .lean();

    if (historyRaw.length === 0) return NextResponse.json({ history: [] });

    // Step 2: explicit recipe lookup — always gets current imageUrl from recipes collection
    const recipeIds = historyRaw
      .map((h) => {
        try { return new mongoose.Types.ObjectId(h.recipeId.toString()); }
        catch { return null; }
      })
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const recipes = await Recipe.find({ _id: { $in: recipeIds } }).lean();
    const recipeMap = new Map(recipes.map((r) => [r._id.toString(), r]));

    // Step 3: merge history + live recipe data, sanitizing imageUrl
    const enriched = historyRaw.map((h) => {
      const recipeDoc = recipeMap.get(h.recipeId?.toString());
      if (!recipeDoc) return null; // recipe deleted — skip
      const ingredients = (recipeDoc.ingredients ?? []).map((i) =>
        typeof i === 'string' ? i : (i as { name?: string }).name ?? ''
      );
      return {
        _id: h._id,
        viewedAt: h.viewedAt,
        recipeId: {
          ...recipeDoc,
          imageUrl: sanitizeImageUrl(recipeDoc.imageUrl, recipeDoc.title, ingredients),
        },
      };
    }).filter(Boolean);

    return NextResponse.json({ history: enriched });
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
