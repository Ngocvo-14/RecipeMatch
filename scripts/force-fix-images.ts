import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'recipematch';

const RULES: Array<[string, string]> = [
  // SALMON
  ['miso salmon',     'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['steamed salmon',  'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['salmon on leek',  'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['salmon tartare',  'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['salmon gravlax',  'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['grilled salmon',  'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['baked salmon',    'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['salmon en croute','https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['salmon en croûte','https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['double-salmon',   'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],
  ['salmon',          'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg'],

  // SHRIMP/SEAFOOD
  ['shrimp fried rice',      'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['garlic butter shrimp',   'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp scampi',          'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp and grits',       'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp cocktail',        'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood paella',         'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood gumbo',          'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood chowder',        'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['seafood miso noodle',    'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['seafood cannelloni',     'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['seafood risotto',        'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'],
  ['seafood stew',           'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood cocktail',       'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['new england seafood',    'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['hearty seafood',         'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['shrimp',                 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['prawn',                  'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['seafood',                'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['lobster',                'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'],
  ['crab',                   'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'],
  ['tuna',                   'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['fish and chips',         'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['fish',                   'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],

  // PASTA
  ['spaghetti tacos',    'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['spaghetti bolognese','https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['carbonara',          'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['lasagna',            'https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg'],
  ['lasagne',            'https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg'],
  ['mac and cheese',     'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'],
  ['mac & cheese',       'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'],
  ['fettuccine alfredo', 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['chicken alfredo',    'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['cannelloni',         'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['spaghetti',          'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['pasta',              'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['penne',              'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['rigatoni',           'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],
  ['linguine',           'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['tagliatelle',        'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['fettuccine',         'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'],
  ['gnocchi',            'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'],

  // NOODLES
  ['pad thai',   'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'],
  ['tom yum',    'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['tom kha',    'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['ramen',      'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['miso soup',  'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['miso noodle','https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['pho',        'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['udon',       'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['soba',       'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['lo mein',    'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'],
  ['chow mein',  'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'],
  ['noodle',     'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],

  // TACOS/MEXICAN
  ['walking tacos',   'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['tarantula tacos', 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['keto taco',       'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['taco',            'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['burrito',         'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['enchilada',       'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['fajita',          'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['quesadilla',      'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],
  ['nachos',          'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'],

  // BEEF
  ['beef wellington',  'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'],
  ['beef bourguignon', 'https://www.themealdb.com/images/media/meals/vrspxw1511793951.jpg'],
  ['beef stroganoff',  'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'],
  ['beef stew',        'https://www.themealdb.com/images/media/meals/vrspxw1511793951.jpg'],
  ['pot roast',        'https://www.themealdb.com/images/media/meals/vrspxw1511793951.jpg'],
  ['keto burger',      'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg'],
  ['classic burger',   'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg'],
  ['cheeseburger',     'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg'],
  ['hamburger',        'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg'],
  ['burger',           'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg'],
  ['steak',            'https://www.themealdb.com/images/media/meals/qtwtss1468572261.jpg'],
  ['ribeye',           'https://www.themealdb.com/images/media/meals/qtwtss1468572261.jpg'],
  ['meatball',         'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg'],
  ['meatloaf',         'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'],
  ['ground beef',      'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg'],
  ['beef',             'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'],

  // CHICKEN
  ['chicken tikka',      'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['tikka masala',       'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['butter chicken',     'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['chicken parmesan',   'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg'],
  ['chicken parmigiana', 'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg'],
  ['fried chicken',      'https://www.themealdb.com/images/media/meals/wqurwm1511435409.jpg'],
  ['chicken wing',       'https://www.themealdb.com/images/media/meals/wqurwm1511435409.jpg'],
  ['roast chicken',      'https://www.themealdb.com/images/media/meals/l0tqyy1503661852.jpg'],
  ['whole chicken',      'https://www.themealdb.com/images/media/meals/l0tqyy1503661852.jpg'],
  ['chicken soup',       'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['chicken curry',      'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['chicken',            'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg'],

  // PORK
  ['crown roast of pork','https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['pork chops',         'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['pork chop',          'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['pork schnitzel',     'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['schnitzel',          'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['pulled pork',        'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['pork belly',         'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],
  ['bacon',              'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg'],
  ['sausage',            'https://www.themealdb.com/images/media/meals/sqrtwu1511721265.jpg'],
  ['chorizo',            'https://www.themealdb.com/images/media/meals/sqrtwu1511721265.jpg'],
  ['pork',               'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg'],

  // LAMB
  ["shepherd's pie", 'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg'],
  ['shepherds pie',  'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg'],
  ['rack of lamb',   'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg'],
  ['lamb chop',      'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg'],
  ['lamb',           'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg'],
  ['mutton',         'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg'],

  // RICE
  ['fried rice', 'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['rice bowl',  'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],
  ['bibimbap',   'https://www.themealdb.com/images/media/meals/1547560386.jpg'],
  ['biryani',    'https://www.themealdb.com/images/media/meals/y33tfl1504347575.jpg'],
  ['pilaf',      'https://www.themealdb.com/images/media/meals/y33tfl1504347575.jpg'],
  ['pilau',      'https://www.themealdb.com/images/media/meals/y33tfl1504347575.jpg'],
  ['risotto',    'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'],
  ['rice',       'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg'],

  // EGGS/BREAKFAST
  ['egg foo young', 'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg'],
  ['eggs benedict', 'https://www.themealdb.com/images/media/meals/1550441882.jpg'],
  ['french toast',  'https://www.themealdb.com/images/media/meals/1550441882.jpg'],
  ['omelette',      'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg'],
  ['omelet',        'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg'],
  ['frittata',      'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg'],
  ['pancake',       'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg'],
  ['waffle',        'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg'],
  ['egg',           'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg'],

  // SOUP/STEW
  ['french onion soup', 'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['clam chowder',      'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['chowder',           'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['bisque',            'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'],
  ['chili',             'https://www.themealdb.com/images/media/meals/vrspxw1511793951.jpg'],
  ['gumbo',             'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg'],
  ['minestrone',        'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['soup',              'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['stew',              'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],
  ['broth',             'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'],

  // SALAD/VEG
  ['caesar salad',   'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg'],
  ['salad',          'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg'],
  ['stuffed pepper', 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'],
  ['stir fry',       'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'],
  ['stir-fry',       'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'],
  ['vegetable',      'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'],
  ['veggie',         'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'],
  ['vegan',          'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'],
  ['avocado',        'https://www.themealdb.com/images/media/meals/ya8w8w1511721089.jpg'],
  ['broccoli',       'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'],

  // PIZZA
  ['pizza',     'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg'],
  ['flatbread', 'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg'],
  ['calzone',   'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg'],

  // CURRY/INDIAN
  ['korma',    'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['vindaloo', 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['curry',    'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'],
  ['dal',      'https://www.themealdb.com/images/media/meals/y33tfl1504347575.jpg'],

  // ASIAN
  ['bulgogi',  'https://www.themealdb.com/images/media/meals/1547560386.jpg'],
  ['kimchi',   'https://www.themealdb.com/images/media/meals/1547560386.jpg'],
  ['korean',   'https://www.themealdb.com/images/media/meals/1547560386.jpg'],
  ['sushi',    'https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg'],
  ['dumpling', 'https://www.themealdb.com/images/media/meals/1525876468.jpg'],
  ['gyoza',    'https://www.themealdb.com/images/media/meals/1525876468.jpg'],
  ['teriyaki', 'https://www.themealdb.com/images/media/meals/tyywsw1511461648.jpg'],

  // DESSERT
  ['brownie',        'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg'],
  ['cheesecake',     'https://www.themealdb.com/images/media/meals/quwsyp1511191564.jpg'],
  ['cookie',         'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'],
  ['ice cream',      'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'],
  ['chocolate cake', 'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg'],
  ['chocolate',      'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg'],
  ['cake',           'https://www.themealdb.com/images/media/meals/qtqwsw1511391462.jpg'],
  ['cupcake',        'https://www.themealdb.com/images/media/meals/qtqwsw1511391462.jpg'],
  ['muffin',         'https://www.themealdb.com/images/media/meals/qtqwsw1511391462.jpg'],
  ['dessert',        'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg'],
  ['pudding',        'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg'],
];

const GENERIC_POOL = [
  'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
  'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg',
  'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg',
  'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
  'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg',
  'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg',
  'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg',
  'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg',
  'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg',
  'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg',
  'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg',
  'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg',
];

function hashStr(s: string): number {
  return Math.abs(s.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0));
}

function getImage(title: string): string {
  const t = title.toLowerCase();
  let best: { url: string; len: number } | null = null;
  for (const [kw, url] of RULES) {
    if (t.includes(kw) && (!best || kw.length > best.len)) {
      best = { url, len: kw.length };
    }
  }
  if (best) return best.url;
  return GENERIC_POOL[hashStr(title) % GENERIC_POOL.length];
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('recipes');

  const all = await col.find({}).project({ _id: 1, title: 1, name: 1, sourceId: 1, imageUrl: 1 }).toArray();
  console.log(`Total recipes: ${all.length}`);

  // Skip recipes seeded directly from TheMealDB — they already have real per-recipe photos
  const toFix = all.filter((r) => !String(r.sourceId || '').startsWith('themealdb_'));
  console.log(`Skipping ${all.length - toFix.length} TheMealDB-seeded recipes (real photos), fixing ${toFix.length} others`);

  // Build bulk operations
  const ops = toFix.map((r) => {
    const title: string = r.title || r.name || '';
    return {
      updateOne: {
        filter: { _id: r._id },
        update: { $set: { imageUrl: getImage(title) } },
      },
    };
  });

  let updated = 0;
  for (let i = 0; i < ops.length; i += 500) {
    const batch = ops.slice(i, i + 500);
    if (batch.length > 0) await col.bulkWrite(batch as Parameters<typeof col.bulkWrite>[0]);
    updated += batch.length;
    console.log(`Updated ${updated}/${ops.length}`);
  }

  console.log('\n✅ Done! All recipes updated.');

  // Spot-check
  const checks = ['salmon', 'burger', 'shrimp', 'taco', 'pasta', 'chicken', 'pork chop'];
  for (const kw of checks) {
    const r = await col.findOne({
      $or: [{ title: { $regex: new RegExp(kw, 'i') } }, { name: { $regex: new RegExp(kw, 'i') } }],
    });
    if (r) console.log(`  ${kw}: "${r.title}" → ${(r.image as string)?.split('/').pop()}`);
  }

  await client.close();
}

main().catch(console.error);
