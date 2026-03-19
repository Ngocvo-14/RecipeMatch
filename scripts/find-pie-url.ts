import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  // Show EXACT imageUrl for the pie-showing recipes
  const targets = ['Seafood Paella', 'Hearty Seafood Gumbo', 'Seafood Miso Noodle', 'Jamaican Curry Shrimp', 'Dinner Tonight.*Shrimp', 'Shrimp.*Grits'];
  for (const t of targets) {
    const r = await col.findOne({ title: { $regex: new RegExp(t, 'i') } });
    if (r) console.log(`${r.title}: imageUrl=${r.imageUrl}`);
  }

  // Top 15 most-used imageUrls across entire DB
  const all = await col.find({}).project({ imageUrl: 1, title: 1 }).toArray();
  const counts = new Map<string, string[]>();
  for (const r of all) {
    const url = (r.imageUrl as string) || 'NONE';
    if (!counts.has(url)) counts.set(url, []);
    counts.get(url)!.push(r.title as string);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1].length - a[1].length);
  console.log('\nTop 15 most-used imageUrls:');
  sorted.slice(0, 15).forEach(([url, titles]) => {
    const id = url.split('/').pop();
    console.log(`  ${titles.length}x ${id}: ${titles.slice(0, 2).join(', ')}`);
  });

  await client.close();
}

main().catch(console.error);
