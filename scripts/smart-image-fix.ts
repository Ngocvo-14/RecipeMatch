import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Map of title keywords → correct TheMealDB image URL
// Priority: more specific keywords first
const KEYWORD_IMAGE_MAP: Array<{ keywords: string[]; url: string }> = [
  // VIETNAMESE
  { keywords: ['vietnamese pho', 'pho'], url: 'https://www.themealdb.com/images/media/meals/uxstqp1511429192.jpg' },
  { keywords: ['vietnamese', 'viet', 'bun thit', 'banh mi', 'pho', 'bun bo', 'banh xeo'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },

  // KOREAN
  { keywords: ['bibimbap'], url: 'https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg' },
  { keywords: ['kimchi', 'korean', 'bulgogi', 'japchae', 'tteok'], url: 'https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg' },

  // JAPANESE
  { keywords: ['sushi', 'maki', 'nigiri'], url: 'https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg' },
  { keywords: ['ramen', 'udon', 'soba', 'miso soup', 'tonkatsu', 'japanese', 'teriyaki', 'yakitori', 'tempura', 'gyoza', 'edamame'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },

  // CHINESE
  { keywords: ['dim sum', 'wonton', 'dumpling', 'potsticker', 'kung pao', 'mapo tofu', 'fried rice', 'chow mein', 'lo mein', 'chinese', 'peking', 'szechuan', 'cantonese', 'egg foo young', 'spring roll'], url: 'https://www.themealdb.com/images/media/meals/1525876468.jpg' },

  // THAI
  { keywords: ['pad thai', 'thai green curry', 'thai red curry', 'thai basil', 'som tam', 'massaman', 'thai'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },

  // INDIAN
  { keywords: ['tikka masala', 'butter chicken', 'murgh'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },
  { keywords: ['biryani', 'pilau', 'pilaf'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },
  { keywords: ['curry', 'korma', 'vindaloo', 'saag', 'palak', 'dal', 'dhal', 'masala', 'indian', 'naan', 'roti', 'chapati', 'paratha', 'samosa', 'chutney'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },

  // SEAFOOD - SPECIFIC
  { keywords: ['salmon'], url: 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg' },
  { keywords: ['tuna', 'ahi tuna'], url: 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg' },
  { keywords: ['shrimp', 'prawn', 'scampi'], url: 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg' },
  { keywords: ['lobster', 'crab', 'scallop', 'clam', 'mussel', 'oyster'], url: 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg' },
  { keywords: ['fish soup', 'ukha', 'bouillabaisse', 'fish stew', 'fish curry', 'fish taco', 'fish and chip', 'grilled fish', 'baked fish', 'fried fish', 'fish fillet', 'cod', 'tilapia', 'halibut', 'trout', 'haddock', 'bass', 'mahi', 'catfish', 'pollock', 'flounder', 'anchovy', 'sardine', 'herring'], url: 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg' },
  { keywords: ['seafood', 'paella', 'gumbo', 'cioppino', 'calamari', 'squid', 'octopus'], url: 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg' },

  // RICE
  { keywords: ['chopstick ready rice', 'microwave rice', 'jasmine rice', 'basmati', 'white rice', 'brown rice', 'rice bowl', 'rice recipe', 'rice pilaf', 'rice-bowl'], url: 'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg' },
  { keywords: ['mushroom rice', 'mushroom risotto', 'risotto'], url: 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg' },
  { keywords: ['fried rice'], url: 'https://www.themealdb.com/images/media/meals/1525876468.jpg' },

  // PASTA & NOODLES
  { keywords: ['spaghetti bolognese', 'bolognese'], url: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg' },
  { keywords: ['carbonara'], url: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg' },
  { keywords: ['lasagna', 'lasagne'], url: 'https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg' },
  { keywords: ['mac and cheese', 'mac & cheese', 'macaroni'], url: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg' },
  { keywords: ['pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'rigatoni', 'tagliatelle', 'noodle'], url: 'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg' },
  { keywords: ['ramen', 'pho', 'udon', 'soba', 'vermicelli', 'miso noodle'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },

  // CHICKEN
  { keywords: ['chicken tikka', 'tikka'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },
  { keywords: ['fried chicken', 'crispy chicken', 'chicken wing', 'chicken tender', 'chicken strip', 'chicken nugget'], url: 'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg' },
  { keywords: ['chicken taco', 'chicken burrito', 'chicken fajita', 'chicken quesadilla'], url: 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg' },
  { keywords: ['chicken salad', 'chicken avocado', 'grilled chicken salad'], url: 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg' },
  { keywords: ['chicken soup', 'chicken noodle', 'chicken broth', 'chicken stew'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },
  { keywords: ['chicken'], url: 'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg' },

  // PORK
  { keywords: ['pork chop', 'grilled pork', 'pork schnitzel', 'crown roast', 'pulled pork', 'pork belly', 'carnitas', 'pork loin', 'pork tenderloin', 'pork ribs', 'pork roast'], url: 'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg' },
  { keywords: ['bacon', 'pancetta', 'prosciutto'], url: 'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg' },
  { keywords: ['sausage', 'bratwurst', 'chorizo', 'hot dog', 'kielbasa'], url: 'https://www.themealdb.com/images/media/meals/sqrtwu1511721265.jpg' },
  { keywords: ['ham'], url: 'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg' },
  { keywords: ['pork'], url: 'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg' },

  // BEEF
  { keywords: ['beef wellington'], url: 'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg' },
  { keywords: ['beef stroganoff', 'stroganoff'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['steak', 'ribeye', 'sirloin', 't-bone', 'filet mignon', 'beef steak', 'grilled steak'], url: 'https://www.themealdb.com/images/media/meals/qtwtss1468572261.jpg' },
  { keywords: ['burger', 'hamburger', 'cheeseburger', 'smash burger'], url: 'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg' },
  { keywords: ['meatball'], url: 'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg' },
  { keywords: ['beef stew', 'pot roast', 'beef pot', 'beef bourguignon', 'beef brisket'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['taco', 'beef taco', 'ground beef taco'], url: 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg' },
  { keywords: ['beef', 'ground beef', 'mince'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },

  // LAMB
  { keywords: ["shepherd's pie", 'shepherds pie', 'cottage pie'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['rack of lamb', 'lamb chop', 'lamb shank', 'lamb roast'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['moussaka'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['lamb', 'mutton'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },

  // MEXICAN
  { keywords: ['taco', 'burrito', 'enchilada', 'fajita', 'quesadilla', 'nachos', 'tamale', 'mexican', 'tex-mex'], url: 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg' },
  { keywords: ['guacamole', 'avocado dip', 'avocado toast'], url: 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg' },

  // EGGS & BREAKFAST
  { keywords: ['eggs benedict', 'salmon eggs', 'hollandaise'], url: 'https://www.themealdb.com/images/media/meals/1550441882.jpg' },
  { keywords: ['omelette', 'omelet', 'frittata', 'quiche', 'scrambled egg', 'fried egg', 'poached egg'], url: 'https://www.themealdb.com/images/media/meals/1550441882.jpg' },
  { keywords: ['pancake', 'waffle', 'crepe', 'french toast'], url: 'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg' },
  { keywords: ['egg'], url: 'https://www.themealdb.com/images/media/meals/1550441882.jpg' },

  // SOUP & STEW
  { keywords: ['french onion soup'], url: 'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg' },
  { keywords: ['clam chowder', 'corn chowder', 'new england chowder', 'bisque'], url: 'https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg' },
  { keywords: ['minestrone', 'lentil soup', 'vegetable soup', 'tomato soup', 'onion soup'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },
  { keywords: ['chili', 'chile'], url: 'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg' },
  { keywords: ['soup', 'stew', 'broth', 'potage', 'chowder', 'bisque', 'bouillabaisse'], url: 'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg' },

  // PIZZA
  { keywords: ['pizza', 'flatbread', 'calzone'], url: 'https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg' },

  // SALAD
  { keywords: ['salad', 'coleslaw', 'slaw', 'tabbouleh', 'caprese'], url: 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg' },

  // SANDWICH
  { keywords: ['sandwich', 'sub', 'hoagie', 'panini', 'club sandwich', 'blt', 'grilled cheese'], url: 'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg' },
  { keywords: ['wrap', 'tortilla wrap', 'pita wrap'], url: 'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg' },

  // DESSERTS
  { keywords: ['cheesecake'], url: 'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg' },
  { keywords: ['brownie', 'chocolate cake', 'chocolate mousse', 'chocolate'], url: 'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg' },
  { keywords: ['ice cream', 'gelato', 'sorbet'], url: 'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg' },
  { keywords: ['donut', 'doughnut', 'churro'], url: 'https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg' },
  { keywords: ['cookie', 'biscuit'], url: 'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg' },
  { keywords: ['cake', 'tart', 'cobbler', 'pie', 'pudding', 'dessert', 'sweet', 'muffin', 'cupcake'], url: 'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg' },

  // VEGETABLES
  { keywords: ['stir fry', 'stir-fry'], url: 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg' },
  { keywords: ['avocado'], url: 'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg' },
  { keywords: ['mushroom'], url: 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg' },
  { keywords: ['vegetable', 'veggie', 'vegan', 'vegetarian', 'broccoli', 'cauliflower', 'asparagus', 'zucchini', 'eggplant', 'tofu', 'tempeh'], url: 'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg' },
];

// Working fallback pool (all confirmed 200 OK)
const FALLBACK_POOL = [
  'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
  'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
  'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg',
  'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg',
  'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg',
  'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg',
  'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg',
  'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg',
  'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg',
  'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg',
  'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg',
  'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg',
];

// BAD URLs that need replacement regardless
const BAD_FRAGMENTS = [
  'xqwwpy', 'wrssvt', 'xoqwpt', 'ysxwuq',
  'wvpvwu', 'g9utws', 'ysqmuu', 'tyywsw',
  'xrzuwr', 'vrspxw', 'tywsqp', 'qtqwsw',
  'ya8w8w', '1547560386', 'y33tfl', 'l0tqyy',
  'wqurwm', 'xxyupu', 'joxuw6', 'quwsyp',
  'yypvst', 'llcbn0', 'wtsvxx',
];

function isBadUrl(url: string): boolean {
  return BAD_FRAGMENTS.some(f => url.includes(f));
}

function getBestImage(title: string): string {
  const t = title.toLowerCase();
  for (const entry of KEYWORD_IMAGE_MAP) {
    if (entry.keywords.some(kw => t.includes(kw))) {
      return entry.url;
    }
  }
  // Hash-based fallback
  const h = Math.abs(title.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0));
  return FALLBACK_POOL[h % FALLBACK_POOL.length];
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'recipematch');
  const col = db.collection('recipes');

  // Get ALL recipes that have a backfill/fallback image (not original source images)
  // We identify these as recipes whose imageUrl contains themealdb fallback filenames
  const all = await col.find({}, { projection: { _id: 1, title: 1, imageUrl: 1 } }).toArray();

  console.log(`Total recipes: ${all.length}`);

  const toFix = all.filter(r => {
    const url = (r.imageUrl || '') as string;
    // Only fix recipes using our fallback TheMealDB pool URLs (not original source images)
    // Original source images come from allrecipes, food.com, etc. and have long/complex URLs
    const isOurFallback = FALLBACK_POOL.some(f => url.includes(f.split('/').pop()!.replace('.jpg', ''))) || isBadUrl(url);
    return isOurFallback;
  });

  console.log(`Recipes with fallback/bad images to re-assign: ${toFix.length}`);

  let fixed = 0;
  const ops = toFix.map(r => {
    const newUrl = getBestImage(r.title || '');
    return {
      updateOne: {
        filter: { _id: r._id },
        update: { $set: { imageUrl: newUrl } }
      }
    };
  });

  for (let i = 0; i < ops.length; i += 500) {
    await col.bulkWrite(ops.slice(i, i + 500) as any);
    fixed += Math.min(500, ops.length - i);
    console.log(`Fixed ${fixed}/${toFix.length}...`);
  }

  console.log(`\n✅ Done! Fixed ${fixed} recipes`);

  // Show sample results for key problem recipes
  const checks = ['Korean Bibimbap', 'Kimchi', 'Vietnamese Pho', 'Honey Teriyaki Salmon', 'Fish Soup', 'Seafood curry', 'Chopstick Ready Rice', 'Mushroom rice', 'Instant Pot Chicken Taco', 'Chicken breast with avocado'];
  console.log('\nVerification:');
  for (const kw of checks) {
    const r = await col.findOne({ title: { $regex: new RegExp(kw, 'i') } });
    if (r) console.log(`  "${r.title}" → ${(r.imageUrl as string)?.split('/').pop()}`);
  }

  await client.close();
}
main().catch(console.error);
