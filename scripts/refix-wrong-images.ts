import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

// Specific known-good Unsplash photo IDs for common food categories
// These are verified food photos
const CURATED: Record<string, string> = {
  // Salmon & fish
  salmon: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  'grilled salmon': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  'miso salmon': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  'baked salmon': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  'steamed salmon': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  tuna: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  fish: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800',
  shrimp: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
  prawn: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
  seafood: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800',
  // Vietnamese
  pho: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
  vietnamese: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
  'banh mi': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
  // Korean
  bibimbap: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800',
  kimchi: 'https://images.unsplash.com/photo-1583224994559-1a2b774d8818?w=800',
  korean: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=800',
  // Pork
  'pork chop': 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800',
  'crown roast': 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800',
  'grilled pork': 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800',
  pork: 'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800',
  // Chicken
  chicken: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  // Beef
  steak: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800',
  beef: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  // Pasta
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  spaghetti: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
  carbonara: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
  // Rice
  rice: 'https://images.unsplash.com/photo-1536304993881-ff86e0c9e5af?w=800',
  // Soup
  soup: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
  ramen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  // Pizza
  pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  // Salad
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  // Dessert
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
  chocolate: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
  // Eggs
  egg: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800',
  // Curry
  curry: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
  // Tacos
  taco: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800',
};

// Known bad Unsplash URLs that return wrong food (potato gratin showing for everything)
const BAD_UNSPLASH_FRAGMENTS = [
  'photo-1741376509360', // potato gratin - showing for salmon
  'photo-1764333580740', // wrong image
  'photo-1765568741171', // wrong image
];

function isBadUrl(url: string): boolean {
  return BAD_UNSPLASH_FRAGMENTS.some(f => url.includes(f));
}

function getCuratedImage(title: string): string | null {
  const t = title.toLowerCase();
  // Check longest matches first
  const sorted = Object.entries(CURATED).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, url] of sorted) {
    if (t.includes(keyword)) return url;
  }
  return null;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const all = await col.find({}, { projection: { _id: 1, title: 1, imageUrl: 1 } }).toArray();

  const toFix = all.filter(r => isBadUrl((r.imageUrl || '') as string));
  console.log(`Recipes with known bad Unsplash images: ${toFix.length}`);
  toFix.slice(0, 10).forEach(r => console.log(`  "${r.title}" → ${(r.imageUrl as string).substring(30, 70)}`));

  let fixed = 0;
  const ops = [];
  for (const r of toFix) {
    const newUrl = getCuratedImage(r.title as string);
    if (newUrl) {
      ops.push({
        updateOne: {
          filter: { _id: r._id },
          update: { $set: { imageUrl: newUrl } }
        }
      });
      fixed++;
    }
  }

  if (ops.length > 0) {
    await col.bulkWrite(ops as any);
  }
  console.log(`✅ Fixed ${fixed} recipes with curated images`);
  console.log(`⚠️  ${toFix.length - fixed} recipes had no keyword match`);

  await client.close();
}
main().catch(console.error);
