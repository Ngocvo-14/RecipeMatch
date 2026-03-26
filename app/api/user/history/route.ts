import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import History from '@/models/History';
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

    const enriched = history.map((h) => {
      const recipe = h.recipeId as Record<string, unknown> | null;
      if (!recipe) return h;
      const ingredients = ((recipe.ingredients ?? []) as unknown[]).map((i) =>
        typeof i === 'string' ? i : ((i as Record<string, string>).name ?? '')
      );
      return {
        ...h,
        recipeId: {
          ...recipe,
          imageUrl: sanitizeImageUrl(recipe.imageUrl, recipe.title as string ?? '', ingredients),
        },
      };
    });

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
