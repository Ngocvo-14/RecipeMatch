import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'recipematch';

// All known bad/broken TheMealDB image IDs
const BAD_IMAGE_FRAGMENTS = [
  'xqwwpy1511793882',  // shepherd's pie — wrong for most recipes
  'xoqwpt1511599260',  // broken 404
  'ysxwuq1487323065',  // broken 404
  'unsplash',
  'picsum',
  'loremflickr',
  'X-Amz-Signature',
];

// Large keyword → image map, sorted longest-keyword-first for best matching
const IMAGE_MAP: Array<{ keywords: string[]; url: string }> = [
  // Salmon specifically
  { keywords: ['miso salmon','steamed salmon','salmon on leek','salmon tartare','salmon gravlax','double-salmon','salmon en croûte','salmon en croute','easy grilled salmon','baked salmon','grilled salmon','salmon fillet','salmon burger','salmon pasta','salmon cake','salmon patty'], url: 'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg' },
  { keywords: ['salmon'], url: 'https://www.themealdb.com/images/media/meals/xxyupu1468262513.jpg' },

  // Pasta & noodles
  { keywords: ['spaghetti bolognese','bolognese'], url: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg' },
  { keywords: ['spaghetti taco','spaghetti tacos'], url: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg' },
  { keywords: ['carbonara'], url: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg' },
  { keywords: ['lasagna','lasagne'], url: 'https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg' },
  { keywords: ['mac and cheese','mac & cheese','macaroni and cheese'], url: 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg' },
  { keywords: ['fettuccine alfredo','chicken alfredo'], url: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg' },
  { keywords: ['cannelloni'], url: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg' },
  { keywords: ['pasta','spaghetti','penne','rigatoni','linguine','tagliatelle','fettuccine','macaroni','gnocchi'], url: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg' },
  { keywords: ['pad thai'], url: 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg' },
  { keywords: ['ramen','udon','soba','pho','miso noodle','noodle soup','noodle'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },

  // Tacos & Mexican
  { keywords: ['walking taco','walking tacos','tarantula taco','tarantula tacos'], url: 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg' },
  { keywords: ['keto taco'], url: 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg' },
  { keywords: ['taco','burrito','enchilada','fajita','quesadilla'], url: 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg' },

  // Beef
  { keywords: ['beef wellington'], url: 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg' },
  { keywords: ['beef stroganoff','stroganoff'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['beef bourguignon'], url: 'https://www.themealdb.com/images/media/meals/vrspxw1511793951.jpg' },
  { keywords: ['beef stew','pot roast'], url: 'https://www.themealdb.com/images/media/meals/vrspxw1511793951.jpg' },
  { keywords: ['keto burger','classic burger','hamburger','cheeseburger','smash burger','burger'], url: 'https://www.themealdb.com/images/media/meals/xrzuwr1468233994.jpg' },
  { keywords: ['steak','ribeye','sirloin','t-bone','filet'], url: 'https://www.themealdb.com/images/media/meals/qtwtss1468572261.jpg' },
  { keywords: ['meatball'], url: 'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg' },
  { keywords: ['meatloaf'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['ground beef','beef mince'], url: 'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg' },
  { keywords: ['beef'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },

  // Chicken
  { keywords: ['chicken tikka','tikka masala','butter chicken'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },
  { keywords: ['chicken parmesan','chicken parmigiana'], url: 'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg' },
  { keywords: ['fried chicken','chicken wing','crispy chicken'], url: 'https://www.themealdb.com/images/media/meals/wqurwm1511435409.jpg' },
  { keywords: ['roast chicken','whole chicken'], url: 'https://www.themealdb.com/images/media/meals/l0tqyy1503661852.jpg' },
  { keywords: ['chicken soup','chicken noodle'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },
  { keywords: ['chicken curry'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },
  { keywords: ['chicken'], url: 'https://www.themealdb.com/images/media/meals/tywsqp1511459302.jpg' },

  // Pork
  { keywords: ['crown roast of pork','crown roast pork'], url: 'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg' },
  { keywords: ['pork chop','pork chops','pork schnitzel','schnitzel'], url: 'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg' },
  { keywords: ['pulled pork','pork belly','carnitas'], url: 'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg' },
  { keywords: ['bacon'], url: 'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg' },
  { keywords: ['sausage','bratwurst','chorizo'], url: 'https://www.themealdb.com/images/media/meals/sqrtwu1511721265.jpg' },
  { keywords: ['pork'], url: 'https://www.themealdb.com/images/media/meals/ysqmuu1487424038.jpg' },

  // Seafood
  { keywords: ['seafood paella','shrimp paella','paella'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['seafood cocktail','prawn cocktail','shrimp cocktail'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['seafood gumbo','seafood chowder','seafood stew','seafood risotto'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['garlic butter shrimp','shrimp scampi','garlic shrimp'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['shrimp fried rice'], url: 'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg' },
  { keywords: ['shrimp','prawn'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['tuna'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['fish and chips'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['fish','cod','tilapia','halibut','sea bass','mahi','trout','haddock'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },
  { keywords: ['lobster','crab','scallop','clam','mussel','oyster'], url: 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg' },
  { keywords: ['seafood'], url: 'https://www.themealdb.com/images/media/meals/wrssvt1511556563.jpg' },

  // Lamb
  { keywords: ["shepherd's pie","shepherds pie"], url: 'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg' },
  { keywords: ['rack of lamb','lamb chop'], url: 'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg' },
  { keywords: ['lamb','mutton'], url: 'https://www.themealdb.com/images/media/meals/yypvst1511119310.jpg' },

  // Rice
  { keywords: ['fried rice','rice bowl','shrimp fried rice'], url: 'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg' },
  { keywords: ['biryani','pilau','pilaf'], url: 'https://www.themealdb.com/images/media/meals/y33tfl1504347575.jpg' },
  { keywords: ['risotto'], url: 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg' },
  { keywords: ['rice'], url: 'https://www.themealdb.com/images/media/meals/wvpvwu1511786158.jpg' },

  // Eggs & breakfast
  { keywords: ['egg foo young','foo young'], url: 'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg' },
  { keywords: ['eggs benedict','french toast'], url: 'https://www.themealdb.com/images/media/meals/1550441882.jpg' },
  { keywords: ['omelette','omelet','frittata','scrambled egg'], url: 'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg' },
  { keywords: ['pancake','waffle','crepe'], url: 'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg' },
  { keywords: ['egg'], url: 'https://www.themealdb.com/images/media/meals/g9utws1487341590.jpg' },

  // Soup & stew
  { keywords: ['tom yum','tom kha'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },
  { keywords: ['french onion soup'], url: 'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg' },
  { keywords: ['clam chowder','chowder','bisque'], url: 'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg' },
  { keywords: ['chili','gumbo'], url: 'https://www.themealdb.com/images/media/meals/vrspxw1511793951.jpg' },
  { keywords: ['soup','stew','broth','minestrone'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },

  // Salad & veg
  { keywords: ['caesar salad'], url: 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg' },
  { keywords: ['salad'], url: 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg' },
  { keywords: ['stuffed pepper','stuffed bell pepper'], url: 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg' },
  { keywords: ['stir fry','stir-fry'], url: 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg' },
  { keywords: ['vegetable','veggie','vegan','broccoli','cauliflower'], url: 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg' },
  { keywords: ['avocado'], url: 'https://www.themealdb.com/images/media/meals/ya8w8w1511721089.jpg' },

  // Pizza
  { keywords: ['pizza','flatbread','calzone'], url: 'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg' },

  // Curry
  { keywords: ['curry','korma','vindaloo','masala','dal','lentil curry'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },

  // Asian
  { keywords: ['bibimbap','bulgogi','kimchi','korean'], url: 'https://www.themealdb.com/images/media/meals/1547560386.jpg' },
  { keywords: ['sushi','maki','nigiri'], url: 'https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg' },
  { keywords: ['dumpling','gyoza','potsticker','wonton'], url: 'https://www.themealdb.com/images/media/meals/1525876468.jpg' },
  { keywords: ['teriyaki','yakitori'], url: 'https://www.themealdb.com/images/media/meals/tyywsw1511461648.jpg' },

  // Dessert
  { keywords: ['chocolate brownie','brownie','chocolate cake'], url: 'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg' },
  { keywords: ['cheesecake'], url: 'https://www.themealdb.com/images/media/meals/quwsyp1511191564.jpg' },
  { keywords: ['cookie','biscuit'], url: 'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg' },
  { keywords: ['pie','tart','cobbler'], url: 'https://www.themealdb.com/images/media/meals/xqwwpy1511793882.jpg' },
  { keywords: ['cake','cupcake','muffin'], url: 'https://www.themealdb.com/images/media/meals/qtqwsw1511391462.jpg' },
  { keywords: ['ice cream','gelato'], url: 'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg' },
  { keywords: ['chocolate'], url: 'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg' },
  { keywords: ['dessert','pudding','sweet'], url: 'https://www.themealdb.com/images/media/meals/joxuw61548772904.jpg' },
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
];

function hashStr(s: string): number {
  return Math.abs(s.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0));
}

function getBestImage(title: string): string {
  const t = title.toLowerCase();
  let best: { url: string; score: number } | null = null;
  for (const entry of IMAGE_MAP) {
    for (const kw of entry.keywords) {
      if (t.includes(kw) && (!best || kw.length > best.score)) {
        best = { url: entry.url, score: kw.length };
      }
    }
  }
  if (best) return best.url;
  return GENERIC_POOL[hashStr(title) % GENERIC_POOL.length];
}

function isBadImage(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return true;
  return BAD_IMAGE_FRAGMENTS.some((f) => url.includes(f));
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('recipes');

  const all = await col.find({}).toArray();
  console.log(`Total recipes: ${all.length}`);

  const toFix = all.filter((r) => isBadImage(r.image));
  console.log(`Recipes needing image fix: ${toFix.length}`);

  let fixed = 0;
  for (const recipe of toFix) {
    const title: string = recipe.title || recipe.name || '';
    const newImage = getBestImage(title);
    await col.updateOne({ _id: recipe._id }, { $set: { image: newImage } });
    fixed++;
    if (fixed % 100 === 0) console.log(`Fixed ${fixed}/${toFix.length}...`);
  }
  console.log(`Fixed ${fixed} recipes`);

  // Verify salmon
  const salmonSample = await col.find({
    $or: [{ title: { $regex: /salmon/i } }, { name: { $regex: /salmon/i } }],
  }).limit(5).toArray();
  console.log('\nSalmon sample:');
  salmonSample.forEach((r) => console.log(`  "${r.title}" → ${r.image}`));

  // Verify burger
  const burgerSample = await col.find({
    $or: [{ title: { $regex: /burger/i } }, { name: { $regex: /burger/i } }],
  }).limit(3).toArray();
  console.log('\nBurger sample:');
  burgerSample.forEach((r) => console.log(`  "${r.title}" → ${r.image}`));

  await client.close();
}

main().catch(console.error);
