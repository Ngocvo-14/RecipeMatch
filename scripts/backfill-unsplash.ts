import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const RATE_LIMIT_MS = 1200;

// Priority order for processing — most visible / most wrong first
const PRIORITY_KEYWORDS = [
  'vietnamese', 'pho', 'banh mi', 'bun bo',
  'korean', 'bibimbap', 'kimchi', 'bulgogi',
  'seafood', 'salmon', 'shrimp', 'tuna', 'fish',
  'japanese', 'ramen', 'sushi', 'teriyaki',
  'thai', 'pad thai',
  'chinese', 'fried rice', 'dim sum',
  'indian', 'curry', 'biryani',
  'pasta', 'spaghetti', 'lasagna',
  'chicken', 'beef', 'pork', 'lamb',
  'pizza', 'burger', 'taco',
  'soup', 'stew', 'salad',
];

// Words to strip from title before building the Unsplash search query
const STRIP_PATTERN = new RegExp(
  [
    // Cuisine prefixes
    'vietnamese', 'korean', 'japanese', 'chinese', 'thai', 'indian',
    'mexican', 'italian', 'french', 'greek', 'spanish', 'american',
    'british', 'irish', 'portuguese', 'moroccan', 'turkish', 'lebanese',
    'persian', 'ethiopian', 'cajun', 'southern', 'taiwanese', 'cantonese',
    // Cooking method / appliance prefixes
    'instant pot', 'air fryer', 'slow cooker', 'pressure cooker',
    'one pot', 'one-pot', 'sheet pan', 'skillet',
    // Descriptor words
    'easy', 'quick', 'healthy', 'homemade', 'classic', 'simple',
    'best', 'perfect', 'ultimate', 'super', 'amazing', 'delicious',
    'recipe', 'style', 'inspired',
  ].map(w => w.replace(/[-]/g, '[-\\s]')).join('|'),
  'gi'
);

function buildQuery(title: string): string {
  const cleaned = title
    .replace(STRIP_PATTERN, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `${cleaned} food dish recipe`;
}

// Pick best food photo from results — index 1 often better than 0 for food
function pickBestPhoto(results: any[]): string | null {
  if (!results || results.length === 0) return null;
  // Prefer index 1 if available, else 0
  const pick = results[1] ?? results[0];
  return pick?.urls?.regular || null;
}

async function searchUnsplash(query: string): Promise<string | null> {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&content_filter=high&client_id=${UNSPLASH_KEY}`;
    const res = await fetch(url);
    if (res.status === 403) {
      console.error('Rate limit hit — pausing 60s...');
      await sleep(60000);
      return null;
    }
    if (!res.ok) {
      console.error(`Unsplash error ${res.status} for "${query}"`);
      return null;
    }
    const data = await res.json();
    return pickBestPhoto(data.results);
  } catch (e) {
    console.error(`Fetch failed for "${query}":`, e);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTheMealDb(url: string): boolean {
  return url.includes('themealdb.com/images/media/meals/');
}

function priorityScore(title: string): number {
  const t = title.toLowerCase();
  for (let i = 0; i < PRIORITY_KEYWORDS.length; i++) {
    if (t.includes(PRIORITY_KEYWORDS[i])) return PRIORITY_KEYWORDS.length - i;
  }
  return 0;
}

async function main() {
  if (!UNSPLASH_KEY) {
    console.error('Missing UNSPLASH_ACCESS_KEY in .env.local');
    process.exit(1);
  }

  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const BAD_POOL_IDS = [
    'photo-1563379926898', 'photo-1567620905732', 'photo-1547592180',
    'photo-1555939594', 'photo-1565299624946', 'photo-1482049016688',
    'photo-1540189549336', 'photo-1512621776951', 'photo-1504674900247',
    'photo-1476224203421'
  ];

  const all = await col.find({}, { projection: { _id: 1, title: 1, imageUrl: 1 } }).toArray();
  const toFix = all
    .filter(r => BAD_POOL_IDS.some(id => ((r.imageUrl || '') as string).includes(id)))
    .sort((a, b) => priorityScore(b.title as string) - priorityScore(a.title as string));

  console.log(`Total recipes         : ${all.length}`);
  console.log(`Bad pool (to replace) : ${toFix.length}`);
  console.log(`Est. @ 50/hr          : ${Math.ceil(toFix.length / 50)} hours`);
  console.log('Starting... (Ctrl+C to pause, re-run to resume)\n');

  let fixed = 0;
  let failed = 0;

  for (const recipe of toFix) {
    const title = (recipe.title as string) || '';
    const query = buildQuery(title);
    const imageUrl = await searchUnsplash(query);

    if (imageUrl) {
      await col.updateOne({ _id: recipe._id }, { $set: { imageUrl } });
      fixed++;
      console.log(`✅ [${fixed}/${toFix.length}] "${title}"\n   query: "${query}"\n   → ${imageUrl.split('?')[0]}\n`);
    } else {
      failed++;
      console.log(`❌ [${fixed + failed}/${toFix.length}] "${title}" → no result\n`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log(`Done! Fixed: ${fixed}, Failed: ${failed}`);
  await client.close();
}
main().catch(console.error);
