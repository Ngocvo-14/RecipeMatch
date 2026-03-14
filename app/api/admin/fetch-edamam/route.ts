import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';

const QUERIES = [
  'pasta', 'chicken', 'beef', 'salad', 'soup', 'breakfast',
  'vegan', 'vegetarian', 'keto', 'quick dinner', 'healthy lunch',
  'seafood', 'rice', 'sandwich', 'tacos', 'curry', 'stir fry',
  'pork', 'lamb', 'eggs', 'noodles', 'pizza', 'steak', 'salmon',
];

function difficulty(count: number): 'Easy' | 'Medium' | 'Hard' {
  return count <= 5 ? 'Easy' : count <= 10 ? 'Medium' : 'Hard';
}

function estimatedCost(count: number): number {
  return count <= 5 ? 8 : count <= 10 ? 12 : count <= 15 ? 18 : 22;
}

function cookTimeFromMealType(mealType: string): number {
  const mt = (mealType || '').toLowerCase();
  if (mt.includes('breakfast') || mt.includes('brunch')) return 15;
  if (mt.includes('snack') || mt.includes('teatime')) return 10;
  if (mt.includes('lunch')) return 25;
  if (mt.includes('dinner')) return 35;
  return 30;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformEdamam(hit: any) {
  const r = hit.recipe;
  if (!r) return null;

  const ingredientLines: string[] = r.ingredientLines || [];
  const ingredients = ingredientLines.map((line: string) => ({
    name: line.toLowerCase(),
    quantity: '',
  }));

  const servings = Math.max(1, Math.round(r.yield || 2));
  const safeDiv  = (n?: number) => Math.round((n ?? 0) / servings * 10) / 10;

  const nut = r.totalNutrients || {};
  const nutrition = {
    calories:     Math.round((nut.ENERC_KCAL?.quantity ?? 0) / servings),
    fat:          safeDiv(nut.FAT?.quantity),
    saturatedFat: safeDiv(nut.FASAT?.quantity),
    carbs:        safeDiv(nut.CHOCDF?.quantity),
    sugar:        safeDiv(nut.SUGAR?.quantity),
    fiber:        safeDiv(nut.FIBTG?.quantity),
    protein:      safeDiv(nut.PROCNT?.quantity),
    cholesterol:  safeDiv(nut.CHOLE?.quantity),
    sodium:       Math.round((nut.NA?.quantity ?? 0) / servings),
  };

  const mealTypeRaw = (r.mealType?.[0] || r.dishType?.[0] || '').toLowerCase();
  const mealType = mealTypeRaw.charAt(0).toUpperCase() + mealTypeRaw.slice(1) || 'Main Dish';

  const cuisineRaw = (r.cuisineType?.[0] || '').toLowerCase();
  const cuisine = cuisineRaw.charAt(0).toUpperCase() + cuisineRaw.slice(1) || 'International';

  const diet: string[] = (r.healthLabels || []).filter((l: string) =>
    ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Keto-Friendly', 'Paleo'].includes(l)
  );

  const tags: string[] = [
    ...(r.dishType || []),
    ...(r.cuisineType || []),
    ...(r.dietLabels || []),
  ].map((t: string) => t.toLowerCase()).filter(Boolean);

  const cookTime = r.totalTime > 0 ? r.totalTime : cookTimeFromMealType(mealTypeRaw);

  return {
    title:        r.label,
    imageUrl:     r.image || '',
    description:  '',
    cuisine,
    mealType,
    difficulty:   difficulty(ingredientLines.length),
    cookTime,
    servings,
    ingredients,
    instructions: [],   // Edamam free tier does not provide step-by-step instructions
    tags,
    diet,
    equipment:    [],
    estimatedCost: estimatedCost(ingredientLines.length),
    nutrition,
    source:       r.source || '',
    sourceUrl:    r.url || '',
    videoUrl:     '',
    mealDbId:     '',
  };
}

export async function POST(req: NextRequest) {
  const appId  = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json(
      { error: 'EDAMAM_APP_ID and EDAMAM_APP_KEY must be set in .env.local' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const queries = limitParam ? QUERIES.slice(0, parseInt(limitParam)) : QUERIES;

  try {
    await connectDB();

    let saved = 0;
    let skipped = 0;
    let failed = 0;
    let firstError = '';

    for (const query of queries) {
      try {
        const url =
          `https://api.edamam.com/api/recipes/v2` +
          `?type=public&q=${encodeURIComponent(query)}` +
          `&app_id=${appId}&app_key=${appKey}`;

        const res = await fetch(url, {
          cache: 'no-store',
          headers: { 'Edamam-Account-User': appId },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          if (!firstError) firstError = `HTTP ${res.status} on "${query}": ${body.slice(0, 200)}`;
          failed++;
          continue;
        }

        const data = await res.json();
        const hits = data?.hits ?? [];

        for (const hit of hits) {
          try {
            const doc = transformEdamam(hit);
            if (!doc || !doc.title) { failed++; continue; }

            // Dedup by title (case-insensitive)
            const exists = await Recipe.exists({
              title: { $regex: `^${doc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
            });
            if (exists) { skipped++; continue; }

            await Recipe.create(doc);
            saved++;
          } catch { failed++; }
        }

        // Respect free tier rate limits (10 req/min → ~7s between calls)
        await new Promise((r) => setTimeout(r, 7000));
      } catch (err) {
        console.error(`Edamam query "${query}" error:`, err);
        failed++;
      }
    }

    const total = await Recipe.countDocuments();
    return NextResponse.json({
      success: true,
      saved,
      skipped,
      failed,
      firstError: firstError || null,
      totalInDb: total,
      message: `Edamam fetch done. Saved: ${saved}, Skipped (dupes): ${skipped}, Failed: ${failed}. Total recipes in DB: ${total}`,
    });
  } catch (err) {
    console.error('fetch-edamam error:', err);
    return NextResponse.json({ error: 'Failed to fetch from Edamam' }, { status: 500 });
  }
}
