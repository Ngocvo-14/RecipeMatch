import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  // Inspect a salmon doc to confirm field names
  const sample = await col.findOne({ title: { $regex: /salmon/i } });
  console.log('Sample fields:', Object.keys(sample || {}));
  console.log('  image:', (sample as any)?.image);
  console.log('  imageUrl:', (sample as any)?.imageUrl);

  // Copy image → imageUrl for all docs where image exists and is non-empty
  const result = await col.updateMany(
    { image: { $exists: true, $nin: ['', null] } },
    [{ $set: { imageUrl: '$image' } }],
  );
  console.log(`\nCopied image → imageUrl for ${result.modifiedCount} recipes`);

  // Verify
  const after = await col.findOne({ title: { $regex: /salmon/i } });
  console.log('\nAfter fix:');
  console.log('  image:', (after as any)?.image);
  console.log('  imageUrl:', (after as any)?.imageUrl);

  await client.close();
}

main().catch(console.error);
