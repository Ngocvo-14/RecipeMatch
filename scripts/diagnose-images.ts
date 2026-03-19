import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  // Check specific problem recipes
  const problems = [
    'Seafood Paella', 'Hearty Seafood Gumbo', 'Seafood Miso Noodle',
    'Vietnamese Pho', 'Vietnamese caramel trout', 'Vietnamese Grilled Pork',
    'Korean Bibimbap', 'Kimchi',
  ];

  for (const name of problems) {
    const r = await col.findOne({ title: { $regex: new RegExp(name, 'i') } });
    if (r) console.log(`"${r.title}"\n  → ${r.imageUrl}\n`);
  }

  // Count how many recipes have each specific URL
  const urlCounts = await col.aggregate([
    { $group: { _id: '$imageUrl', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();

  console.log('\nTop 20 most-used imageUrls:');
  urlCounts.forEach(u => console.log(`  ${u.count}x → ${(u._id as string)?.split('/').pop()}`));

  await client.close();
}
main().catch(console.error);
