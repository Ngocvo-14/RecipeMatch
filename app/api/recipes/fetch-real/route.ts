import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';
import { transformMeal } from '@/lib/mealDbTransform';

const CATEGORIES = [
  'Beef','Chicken','Seafood','Vegetarian','Pasta',
  'Breakfast','Pork','Lamb','Side','Starter','Vegan','Miscellaneous',
];
const MEALS_PER_CATEGORY = 20;
const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

async function fetchJson(url: string) {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return null;
  return res.json();
}

// Fetch IDs for a category, up to limit
async function fetchCategoryIds(cat: string): Promise<string[]> {
  const data = await fetchJson(`${MEALDB}/filter.php?c=${encodeURIComponent(cat)}`);
  if (!data?.meals) return [];
  return data.meals.slice(0, MEALS_PER_CATEGORY).map((m: { idMeal: string }) => m.idMeal);
}

// Fetch full meal detail
async function fetchMealDetail(id: string) {
  const data = await fetchJson(`${MEALDB}/lookup.php?i=${id}`);
  return data?.meals?.[0] ?? null;
}

export async function POST() {
  try {
    await connectDB();

    // Collect unique IDs across all categories
    const idSet = new Set<string>();
    for (const cat of CATEGORIES) {
      const ids = await fetchCategoryIds(cat);
      ids.forEach((id) => idSet.add(id));
    }

    const allIds = [...idSet];
    let saved = 0;
    let failed = 0;
    let firstError = '';

    // Fetch details in batches of 10
    const BATCH = 10;
    for (let i = 0; i < allIds.length; i += BATCH) {
      const batch = allIds.slice(i, i + BATCH);
      const details = await Promise.all(batch.map(fetchMealDetail));

      for (const meal of details) {
        if (!meal) { failed++; continue; }
        try {
          const doc = transformMeal(meal);
          await Recipe.findOneAndUpdate(
            { mealDbId: doc.mealDbId },
            { $set: doc },
            { upsert: true, new: true }
          );
          saved++;
        } catch (e) {
          if (!firstError) firstError = String(e);
          failed++;
        }
      }

      // Small delay to be respectful of the free API
      if (i + BATCH < allIds.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return NextResponse.json({
      success: true,
      total: allIds.length,
      saved,
      failed,
      firstError: firstError || null,
      message: `Fetched ${allIds.length} meals from TheMealDB. Saved: ${saved}, Failed: ${failed}`,
    });
  } catch (err) {
    console.error('fetch-real error:', err);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}
