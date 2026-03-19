import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ALL known bad TheMealDB image IDs that show wrong content
const BAD_IDS = [
  'xqwwpy1511793882',  // shepherd's pie - shows for seafood
  'xoqwpt1511599260',  // broken 404
  'ysxwuq1487323065',  // broken 404
];

// Title → correct image (longest match wins)
const RULES: [string, string][] = [
  ['seafood paella',        'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood gumbo',         'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood chowder',       'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['seafood cocktail',      'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood miso noodle',   'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['seafood stew',          'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['hearty seafood',        'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp pepperoncini',   'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp & pepperoncini', 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp fried rice',     'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['shrimp scampi',         'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['garlic butter shrimp',  'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['norwegian fish soup',   'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['fiskesuppe',            'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['salmon',                'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['shrimp',                'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['prawn',                 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['lobster',               'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'],
  ['crab',                  'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'],
  ['seafood',               'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['fish soup',             'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['fish stew',             'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['fish',                  'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['tuna',                  'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['pork chop',             'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['pork schnitzel',        'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['schnitzel',             'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['crown roast',           'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['grilled pork',          'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['pork',                  'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['avocado dip',           'https://www.themealdb.com/images/media/meals/ya8w8w1511721089.jpg'],
  ['guacamole',             'https://www.themealdb.com/images/media/meals/ya8w8w1511721089.jpg'],
  ['avocado',               'https://www.themealdb.com/images/media/meals/ya8w8w1511721089.jpg'],
  ['healthy fried rice',    'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['fried rice',            'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['rice',                  'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['pasta',                 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['spaghetti',             'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['chicken',               'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg'],
  ['burger',                'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg'],
  ['beef',                  'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'],
  ['taco',                  'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['soup',                  'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['stew',                  'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['chowder',               'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['salad',                 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg'],
  ['egg',                   'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg'],
  ['pizza',                 'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg'],
  ['curry',                 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['noodle',                'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['ramen',                 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['cake',                  'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg'],
  ['dessert',               'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg'],
  ['lamb',                  'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg'],
];

const POOL = [
  'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
  'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg',
  'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg',
  'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg',
  'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
  'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg',
  'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg',
  'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg',
];

function hash(s: string) {
  return Math.abs(s.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0));
}

function getCorrectImage(title: string): string {
  const t = title.toLowerCase();
  let best: { url: string; len: number } | null = null;
  for (const [kw, url] of RULES) {
    if (t.includes(kw) && (!best || kw.length > best.len)) {
      best = { url, len: kw.length };
    }
  }
  return best?.url || POOL[hash(title) % POOL.length];
}

function isBad(url: string | null | undefined): boolean {
  if (!url || !url.startsWith('http')) return true;
  return BAD_IDS.some(id => url.includes(id));
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  const all = await col.find({}).project({ _id: 1, title: 1, name: 1, imageUrl: 1 }).toArray();

  const bad = all.filter(r => isBad(r.imageUrl as string));
  const missing = all.filter(r => !r.imageUrl || (r.imageUrl as string).trim() === '');

  console.log(`Total: ${all.length}`);
  console.log(`Bad imageUrl (pie/broken): ${bad.length}`);
  console.log(`Missing imageUrl: ${missing.length}`);

  console.log('\nSample bad recipes:');
  bad.slice(0, 10).forEach(r => console.log(`  "${r.title}" → ${r.imageUrl}`));

  const toFix = [...new Map([...bad, ...missing].map(r => [r._id.toString(), r])).values()];
  console.log(`\nFixing ${toFix.length} recipes...`);

  const ops = toFix.map(r => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: { imageUrl: getCorrectImage(r.title || r.name || '') } },
    },
  }));

  if (ops.length > 0) {
    for (let i = 0; i < ops.length; i += 500) {
      await col.bulkWrite(ops.slice(i, i + 500) as any);
    }
  }

  console.log(`✅ Fixed ${toFix.length} recipes`);

  const checks = ['Shrimp & Pepperoncini', 'Seafood Paella', 'Hearty Seafood', 'Grilled Pork', 'Avocado dip', 'salmon'];
  console.log('\nVerification:');
  for (const kw of checks) {
    const r = await col.findOne({ title: { $regex: new RegExp(kw, 'i') } });
    if (r) console.log(`  "${r.title}" → ${(r.imageUrl as string)?.split('/').pop()}`);
  }

  await client.close();
}

main().catch(console.error);
