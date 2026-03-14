/**
 * One-time cleanup script — remove all auto-generated default collections.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/cleanCollections.ts
 *
 * Or call the API endpoint once:
 *   curl -X POST http://localhost:3000/api/admin/clean-collections
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const DEFAULT_NAMES = [
  'Favorites',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Quick Meals',
  'Want to Try',
  'Weeknight Dinners',
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db!;
  const result = await db.collection('collections').deleteMany({
    name: { $in: DEFAULT_NAMES },
  });

  console.log(`✓ Deleted ${result.deletedCount} default collection(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
