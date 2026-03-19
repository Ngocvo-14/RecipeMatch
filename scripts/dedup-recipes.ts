import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const all = await col.find({}).project({ _id: 1, title: 1, sourceId: 1 }).toArray();
  console.log(`Total before: ${all.length}`);

  const seen = new Map<string, any>();
  const toDelete: any[] = [];

  for (const r of all) {
    const key = (r.title || '').toLowerCase().trim();
    if (seen.has(key)) {
      const existing = seen.get(key);
      if (String(r.sourceId || '').startsWith('themealdb_')) {
        // New one is TheMealDB — keep it, delete existing
        toDelete.push(existing._id);
        seen.set(key, r);
      } else {
        // Existing is better (or equal) — delete new one
        toDelete.push(r._id);
      }
    } else {
      seen.set(key, r);
    }
  }

  if (toDelete.length > 0) {
    const result = await col.deleteMany({ _id: { $in: toDelete } });
    console.log(`Deleted ${result.deletedCount} duplicates`);
  } else {
    console.log('No duplicates found');
  }

  const total = await col.countDocuments();
  console.log(`Total recipes remaining: ${total}`);

  await client.close();
}

main().catch(console.error);
