import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';
import { transformMeal } from '@/lib/mealDbTransform';
import { getFoodImageUrl } from '@/lib/foodImage';

export const dynamic = 'force-dynamic';

function sanitizeImage(recipe: Record<string, unknown>): Record<string, unknown> {
  const img = (recipe.imageUrl ?? recipe.image) as string | undefined;
  const bad = !img || img.trim() === '' ||
    img.includes('picsum') ||
    img.includes('loremflickr') || img.includes('X-Amz-Signature') ||
    img.includes('xqwwpy') || img.includes('xoqwpt') || img.includes('ysxwuq');
  if (!bad) return recipe;
  const ingredients = ((recipe.ingredients ?? []) as unknown[]).map((i) =>
    typeof i === 'string' ? i : ((i as Record<string, string>).name ?? ''),
  );
  const fixed = getFoodImageUrl(recipe.title as string ?? '', ingredients);
  return { ...recipe, imageUrl: fixed, image: fixed };
}

const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    console.log('[search] query:', q);

    await connectDB();

    if (!q) {
      return NextResponse.json({ recipes: [], total: 0, source: 'local' });
    }

    // Search across title, cuisine, tags, mealType
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbQuery: Record<string, any> = {
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { cuisine: { $regex: q, $options: 'i' } },
        { tags: { $elemMatch: { $regex: q, $options: 'i' } } },
        { mealType: { $regex: q, $options: 'i' } },
      ],
    };

    const localRecipes = await Recipe.find(dbQuery).limit(200).lean();

    // Sort by relevance: exact title > title contains > cuisine match > other
    const ql = q.toLowerCase();
    const sorted = localRecipes.sort((a, b) => {
      const scoreDoc = (r: typeof a) => {
        const title = (r.title || '').toLowerCase();
        if (title === ql) return 100;
        if (title.startsWith(ql)) return 80;
        if (title.includes(ql)) return 60;
        if ((r.cuisine || '').toLowerCase().includes(ql)) return 40;
        return 20;
      };
      return scoreDoc(b) - scoreDoc(a);
    });

    // Deduplicate by title (case-insensitive) before slicing
    const seenTitles = new Set<string>();
    const deduped = sorted.filter((r) => {
      const key = (r.title || '').toLowerCase().trim();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });
    const top50 = deduped.slice(0, 50).map((r) => sanitizeImage(r as unknown as Record<string, unknown>));

    // Fall back to TheMealDB only when we have nothing at all
    if (top50.length > 0) {
      return NextResponse.json({ recipes: top50, total: top50.length, source: 'local' });
    }

    // Fallback: search TheMealDB live
    let liveRecipes: object[] = [];
    try {
      const res = await fetch(`${MEALDB}/search.php?s=${encodeURIComponent(q)}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.meals) {
          liveRecipes = data.meals
            .slice(0, 12)
            .map((meal: object) => {
              const t = transformMeal(meal);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return { ...t, _id: 'live_' + (meal as any).idMeal, isLive: true };
            });
        }
      }
    } catch { /* ignore live search failures */ }

    return NextResponse.json({
      recipes: liveRecipes,
      total: liveRecipes.length,
      source: liveRecipes.length > 0 ? 'live' : 'local',
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search recipes' }, { status: 500 });
  }
}
