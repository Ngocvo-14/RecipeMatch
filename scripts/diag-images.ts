import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  // Part 1: shrimp/seafood/salmon exact imageUrls
  const recipes = await col.find({
    $or: [
      { title: { $regex: /shrimp|seafood|salmon|pork chop|avocado/i } },
      { name:  { $regex: /shrimp|seafood|salmon|pork chop|avocado/i } },
    ],
  }).project({ title: 1, imageUrl: 1 }).limit(30).toArray();

  const byUrl = new Map<string, string[]>();
  for (const r of recipes) {
    const url = (r.imageUrl as string) || 'MISSING';
    const urlId = url.split('/').pop() || 'MISSING';
    if (!byUrl.has(urlId)) byUrl.set(urlId, []);
    byUrl.get(urlId)!.push(r.title as string);
  }

  console.log('=== ImageUrl ID → Recipes using it (shrimp/seafood/salmon/pork/avocado) ===');
  for (const [urlId, titles] of byUrl.entries()) {
    console.log(`  ${urlId}: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? ` +${titles.length - 3} more` : ''}`);
  }

  // Part 2: top 20 most-used imageUrl IDs across entire DB
  const all = await col.find({}).project({ title: 1, imageUrl: 1 }).toArray();
  const urlCount = new Map<string, number>();
  for (const r of all) {
    const id = ((r.imageUrl as string) || 'MISSING').split('/').pop() || 'MISSING';
    urlCount.set(id, (urlCount.get(id) || 0) + 1);
  }

  const sorted = [...urlCount.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\n=== Top 20 most-used imageUrl IDs (high count = likely wrong/generic) ===');
  sorted.slice(0, 20).forEach(([id, count]) => console.log(`  ${count}x: ${id}`));

  await client.close();
}

main().catch(console.error);
