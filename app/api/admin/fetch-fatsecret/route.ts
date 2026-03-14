import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';

const QUERIES = [
  'chicken', 'beef', 'pasta', 'salad', 'vegetarian',
  'healthy', 'low carb', 'high protein', 'soup', 'seafood',
  'breakfast', 'vegan', 'pork', 'rice', 'noodles',
];

const TOKEN_URL  = 'https://oauth.fatsecret.com/connect/token';
const API_URL    = 'https://platform.fatsecret.com/rest/server.api';

function difficulty(count: number): 'Easy' | 'Medium' | 'Hard' {
  return count <= 5 ? 'Easy' : count <= 10 ? 'Medium' : 'Hard';
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=basic',
    });
    if (!res.ok) {
      console.error('FatSecret token error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.access_token ?? null;
  } catch (err) {
    console.error('FatSecret token fetch failed:', err);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFatSecret(r: any) {
  if (!r?.recipe_name) return null;

  // Parse nutrition (FatSecret returns strings)
  const n = r.recipe_nutrition || {};
  const safeNum = (v: string | number | undefined) => parseFloat(String(v || '0')) || 0;

  const calories    = safeNum(n.calories);
  const fat         = safeNum(n.fat);
  const carbs       = safeNum(n.carbohydrate);
  const protein     = safeNum(n.protein);
  const fiber       = safeNum(n.fiber);
  const sugar       = safeNum(n.sugar);
  const sodium      = safeNum(n.sodium);
  const cholesterol = safeNum(n.cholesterol);
  const saturatedFat = safeNum(n.saturated_fat);

  const nutrition = { calories, fat, saturatedFat, carbs, sugar, fiber, protein, cholesterol, sodium };

  // Recipe types
  const typeRaw = r.recipe_types?.recipe_type;
  const mealType = Array.isArray(typeRaw)
    ? typeRaw[0]
    : (typeRaw || 'Main Dish');

  // Ingredient lines from description (FatSecret free tier doesn't return full ingredients)
  const description = r.recipe_description || '';

  // Diet inference from type
  const diet: string[] = [];
  const typeLower = mealType.toLowerCase();
  if (typeLower.includes('vegan')) diet.push('Vegan', 'Vegetarian');
  else if (typeLower.includes('vegetarian')) diet.push('Vegetarian');

  return {
    title:         r.recipe_name,
    imageUrl:      r.recipe_image || '',
    description,
    cuisine:       'International',
    mealType:      mealType.charAt(0).toUpperCase() + mealType.slice(1),
    difficulty:    difficulty(5), // FatSecret free tier doesn't expose ingredient count
    cookTime:      30,
    servings:      2,
    ingredients:   [],
    instructions:  [],
    tags:          [],
    diet,
    equipment:     [],
    estimatedCost: 12,
    nutrition,
    source:        'FatSecret',
    sourceUrl:     r.recipe_url || '',
    videoUrl:      '',
    mealDbId:      '',
  };
}

export async function POST() {
  const clientId     = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET must be set in .env.local' },
      { status: 500 }
    );
  }

  try {
    await connectDB();

    // Get OAuth2 token
    const token = await getAccessToken(clientId, clientSecret);
    if (!token) {
      return NextResponse.json({ error: 'Failed to authenticate with FatSecret' }, { status: 401 });
    }

    let saved = 0;
    let skipped = 0;
    let failed = 0;

    for (const query of QUERIES) {
      try {
        const params = new URLSearchParams({
          method: 'recipes.search',
          search_expression: query,
          format: 'json',
          max_results: '20',
          page_number: '0',
        });

        const res = await fetch(`${API_URL}?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 0 },
        });

        if (!res.ok) {
          console.error(`FatSecret query "${query}" failed: ${res.status}`);
          failed++;
          continue;
        }

        const data = await res.json();
        // Response shape: data.recipes.recipe (array) or data.recipes.recipe (single object)
        const raw = data?.recipes?.recipe;
        if (!raw) { skipped++; continue; }

        const recipes = Array.isArray(raw) ? raw : [raw];

        for (const r of recipes) {
          try {
            const doc = transformFatSecret(r);
            if (!doc || !doc.title) { failed++; continue; }

            // Dedup by title or sourceUrl
            const exists = await Recipe.exists({
              $or: [
                { title: { $regex: `^${doc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
                ...(doc.sourceUrl ? [{ sourceUrl: doc.sourceUrl }] : []),
              ],
            });
            if (exists) { skipped++; continue; }

            await Recipe.create(doc);
            saved++;
          } catch { failed++; }
        }

        // Small delay between queries
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`FatSecret query "${query}" error:`, err);
        failed++;
      }
    }

    const total = await Recipe.countDocuments();
    return NextResponse.json({
      success: true,
      saved,
      skipped,
      failed,
      totalInDb: total,
      message: `FatSecret fetch done. Saved: ${saved}, Skipped (dupes): ${skipped}, Failed: ${failed}. Total recipes in DB: ${total}`,
    });
  } catch (err) {
    console.error('fetch-fatsecret error:', err);
    return NextResponse.json({ error: 'Failed to fetch from FatSecret' }, { status: 500 });
  }
}
