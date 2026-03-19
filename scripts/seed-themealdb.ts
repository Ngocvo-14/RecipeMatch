import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'recipematch';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchAllMeals() {
  const allMeals: any[] = [];
  const seenIds = new Set<string>();

  for (const letter of LETTERS) {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`);
    const data = await res.json();
    if (data.meals) {
      for (const meal of data.meals) {
        if (!seenIds.has(meal.idMeal)) {
          seenIds.add(meal.idMeal);
          allMeals.push(meal);
        }
      }
    }
    await sleep(200);
  }
  return allMeals;
}

function transformMeal(meal: any) {
  // Extract ingredients list
  const ingredients: { name: string; amount: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (name) ingredients.push({ name, amount: measure || '' });
  }

  return {
    title: meal.strMeal,
    imageUrl: meal.strMealThumb, // REAL food photo from TheMealDB
    cuisine: meal.strArea || 'International',
    category: meal.strCategory || 'Miscellaneous',
    instructions: meal.strInstructions || '',
    ingredients,
    tags: meal.strTags ? meal.strTags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    youtubeUrl: meal.strYoutube || '',
    source: meal.strSource || '',
    sourceId: `themealdb_${meal.idMeal}`,
    cookTime: null,
    servings: 4,
    difficulty: 'Medium',
    estimatedCost: null,
    createdAt: new Date(),
  };
}

async function main() {
  console.log('Fetching all meals from TheMealDB...');
  const meals = await fetchAllMeals();
  console.log(`Fetched ${meals.length} meals`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('recipes');

  let inserted = 0;
  let skipped = 0;

  for (const meal of meals) {
    const recipe = transformMeal(meal);
    // Skip if already exists by sourceId or title
    const exists = await col.findOne({
      $or: [
        { sourceId: recipe.sourceId },
        { title: { $regex: new RegExp(`^${recipe.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ]
    });
    if (exists) {
      // Update image if existing one is bad
      if (!exists.imageUrl || exists.imageUrl.includes('xqwwpy') || exists.imageUrl.includes('unsplash')) {
        await col.updateOne({ _id: exists._id }, { $set: { imageUrl: recipe.imageUrl } });
      }
      skipped++;
    } else {
      await col.insertOne(recipe);
      inserted++;
    }
  }

  console.log(`✅ Done! Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
  console.log(`Total recipes now: ${await col.countDocuments()}`);

  // Sample to verify images
  const sample = await col.find({ image: { $regex: 'themealdb' } }).limit(5).toArray();
  console.log('\nSample recipes with real TheMealDB images:');
  sample.forEach((r: any) => console.log(`  "${r.title}" → ${r.image}`));

  await client.close();
}

main().catch(console.error);
