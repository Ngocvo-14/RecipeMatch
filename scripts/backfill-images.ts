import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getFoodImageUrl } from '../lib/foodImage';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'recipematch';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set — check .env.local');
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMealDBImage(title: string): Promise<string | null> {
  const words = title.trim().split(/\s+/);
  const queries = [title, words.slice(0, 2).join(' '), words[0]];

  for (const q of queries) {
    if (!q || q.length < 3) continue;
    try {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (data.meals && data.meals[0]?.strMealThumb) {
        return data.meals[0].strMealThumb;
      }
    } catch { /* ignore */ }
    await sleep(100);
  }
  return null;
}

function isBadImage(url: unknown): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return true;
  const u = url.trim();
  return (
    u.includes('unsplash') ||
    u.includes('picsum') ||
    u.includes('loremflickr') ||
    u.includes('placeholder') ||
    u.includes('X-Amz-Signature') ||
    u.includes('edamam-product-images')
  );
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db(DB_NAME);
  const col = db.collection('recipes');

  const total = await col.countDocuments();
  console.log(`Total recipes in DB: ${total}`);

  // Find recipes with missing or bad images
  const recipes = await col.find({
    $or: [
      { image: { $exists: false } },
      { image: null },
      { image: '' },
      { image: { $regex: 'unsplash', $options: 'i' } },
      { image: { $regex: 'picsum', $options: 'i' } },
      { image: { $regex: 'loremflickr', $options: 'i' } },
      { image: { $regex: 'placeholder', $options: 'i' } },
    ],
  }).toArray();

  console.log(`Found ${recipes.length} recipes needing image backfill`);

  if (recipes.length === 0) {
    console.log('Nothing to do!');
    await client.close();
    return;
  }

  let fromMealDB = 0;
  let fromFallback = 0;

  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const title: string = recipe.title || recipe.name || '';
    if (!title) continue;

    // Try TheMealDB API first for a real photo
    let imageUrl = await fetchMealDBImage(title);

    if (imageUrl) {
      fromMealDB++;
    } else {
      // Fall back to keyword-based TheMealDB thumbnail
      const ingredients: string[] = (recipe.ingredients || []).map((ing: unknown) =>
        typeof ing === 'string' ? ing : ((ing as Record<string, string>).name || (ing as Record<string, string>).ingredient || ''),
      );
      imageUrl = getFoodImageUrl(title, ingredients);
      fromFallback++;
    }

    await col.updateOne({ _id: recipe._id }, { $set: { image: imageUrl } });

    if ((i + 1) % 25 === 0 || i === recipes.length - 1) {
      console.log(`  ${i + 1}/${recipes.length} — last: "${title}" → ${imageUrl?.slice(0, 60)}...`);
    }

    // Polite delay so we don't hammer TheMealDB
    await sleep(150);
  }

  console.log(`\n✅ Done! Updated ${recipes.length} recipes`);
  console.log(`   ${fromMealDB} got real TheMealDB photos`);
  console.log(`   ${fromFallback} used keyword fallback`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
