import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BROKEN_ID = 'wrssvt1511556563';

function getReplacementUrl(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('shrimp') || t.includes('prawn')) return 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg';
  if (t.includes('paella') || t.includes('seafood') || t.includes('gumbo')) return 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg';
  if (t.includes('salmon') || t.includes('fish') || t.includes('cod') || t.includes('tuna')) return 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg';
  return 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg';
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const broken = await col.find(
    { imageUrl: { $regex: BROKEN_ID } },
    { projection: { _id: 1, title: 1, imageUrl: 1 } }
  ).toArray();

  console.log(`Found ${broken.length} recipes with wrssvt URL`);
  broken.slice(0, 10).forEach(r => console.log(`  "${r.title}"`));

  for (const r of broken) {
    await col.updateOne(
      { _id: r._id },
      { $set: { imageUrl: getReplacementUrl(r.title || ''), image: getReplacementUrl(r.title || '') } }
    );
  }
  console.log(`✅ Fixed ${broken.length} recipes`);

  // Verify
  const check = await col.find(
    { title: { $regex: /seafood paella|hearty seafood|shrimp/i } },
    { projection: { title: 1, imageUrl: 1 } }
  ).limit(5).toArray();
  console.log('\nVerification:');
  check.forEach(r => console.log(`  "${r.title}" -> ${(r.imageUrl as string).split('/').pop()}`));

  await client.close();
}
main().catch(console.error);
