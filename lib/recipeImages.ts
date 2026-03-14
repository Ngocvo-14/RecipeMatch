// ─── Step 1: Valid source image guard ────────────────────────────────────────
//
// Returns false (= needs fallback) when the URL is:
//   - null / undefined / empty string
//   - contains "placeholder", "default", "no-image", "no_image"
//   - one of our own old generic Unsplash static-photo IDs
//   - a bare source.unsplash.com/?food URL with no recipe-specific query
//
// Recipes with a real source URL (TheMealDB strMealThumb, Spoonacular image,
// etc.) are NEVER touched — this function ensures that.

const GENERIC_UNSPLASH_IDS = new Set([
  'photo-1512621776951-a57141f2eefd', // old generic salad fallback
  'photo-1504674900247-0877df9cc836', // old generic food fallback
  'photo-1466637574441-749b8f19452f', // placeholder used by fixMissingImages script
]);

function isValidSourceImage(url: string | undefined | null): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (/placeholder|default|no[-_]image/i.test(u)) return false;
  for (const id of GENERIC_UNSPLASH_IDS) {
    if (u.includes(id)) return false;
  }
  // Reject bare source.unsplash.com/?food with no recipe-specific query
  if (/source\.unsplash\.com\/[^?]*\?food$/.test(u)) return false;
  // Reject Edamam signed S3 URLs — they contain X-Amz-Expires and expire hourly
  if (/edamam-product-images\.s3\.amazonaws\.com/i.test(u)) return false;
  // Reject any AWS pre-signed URL (X-Amz-Signature present = will expire)
  if (/X-Amz-Signature/i.test(u)) return false;
  return true;
}

// ─── Step 1: Keyword extraction ───────────────────────────────────────────────
//
// FOOD_KEYWORDS is an ordered list of [keyword, searchQuery] pairs.
// Ordering matters: more specific / longer keywords are checked first so
// "stir fry" wins over "fry" and "meatball" wins over "meat".
// Matches on recipe_name.toLowerCase().includes(keyword).

const FOOD_KEYWORDS: [string, string][] = [
  // Multi-word (checked before their single-word components)
  ['stir fry',    'stir fry asian'],
  ['meatball',    'meatballs dish'],
  ['flatbread',   'flatbread'],
  ['bruschetta',  'bruschetta'],
  ['focaccia',    'focaccia bread'],
  ['casserole',   'casserole baked'],
  ['omelette',    'omelette eggs'],
  ['egg',         'eggs breakfast'],
  ['pancake',     'pancakes'],
  ['waffle',      'waffles'],
  ['risotto',     'risotto dish'],
  ['sandwich',    'sandwich food'],
  // Proteins
  ['schnitzel',   'pork dish'],
  ['salmon',      'salmon fillet dish'],
  ['tuna',        'tuna dish'],
  ['shrimp',      'shrimp prawns dish'],
  ['seafood',     'seafood dish'],
  ['sausage',     'sausage dish'],
  ['steak',       'steak grilled'],
  ['roast',       'roast dish'],
  ['bacon',       'bacon dish'],
  ['turkey',      'turkey dish'],
  ['chicken',     'chicken dish cooked'],
  ['beef',        'beef meat dish'],
  ['lamb',        'lamb dish'],
  ['pork',        'pork dish'],
  ['tofu',        'tofu dish'],
  // Dishes
  ['taco',        'tacos mexican food'],
  ['pizza',       'pizza dish'],
  ['pasta',       'pasta dish'],
  ['noodle',      'noodles dish'],
  ['soup',        'soup bowl'],
  ['stew',        'stew bowl'],
  ['curry',       'curry dish'],
  ['salad',       'salad bowl fresh'],
  ['burger',      'burger food'],
  ['wrap',        'wrap food'],
  ['toast',       'toast bread'],
  ['rice',        'rice dish'],
  // Desserts / snacks
  ['chocolate',   'dessert sweet'],
  ['mousse',      'dessert sweet'],
  ['cookie',      'dessert sweet'],
  ['cake',        'dessert sweet'],
  ['dessert',     'dessert sweet'],
  // Vegetables / vegan
  ['avocado',     'avocado dish'],
  ['hummus',      'hummus'],
  ['vegan',       'vegan food healthy'],
  ['vegetarian',  'vegetarian food'],
];

const DEFAULT_QUERY = 'food dish meal';
const POOL_SIZE = 8;

/** Step 1 — returns the Unsplash search query for the first matching keyword. */
function extractFoodKeyword(title: string): string {
  const t = title.toLowerCase();
  for (const [keyword, query] of FOOD_KEYWORDS) {
    if (t.includes(keyword)) return query;
  }
  return DEFAULT_QUERY;
}

// ─── Step 2: Static image pool ────────────────────────────────────────────────
//
// Each key maps to 8 known-good Unsplash photo URLs (stable photo IDs, not
// the unreliable source.unsplash.com random-redirect endpoint).
// Base URLs use w=400&h=300; getImagePool() rewrites them for large requests.

const IMAGE_POOLS: Record<string, string[]> = {
  chicken: [
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1606728035253-49e8a23146de?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop',
  ],
  salmon: [
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1485704686097-ed47f7263ca4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1539136788836-5699e78bfc75?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
  ],
  beef: [
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607116667981-ff5f7481a510?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop',
  ],
  pasta: [
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1551183053-bf91798d615b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567608285969-48e4bbe0d399?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=400&h=300&fit=crop',
  ],
  salad: [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1594834749740-74b3f6764be4?w=400&h=300&fit=crop',
  ],
  soup: [
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1588566565463-180a5b5ff8f6?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571167366136-b57e7b02bb70?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400&h=300&fit=crop',
  ],
  sandwich: [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1481070107529-ad8f04f9e9dd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1606755456206-b25206cde27e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1621852004158-f3bc188ace2d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1550507992-eb63ffee0847?w=400&h=300&fit=crop',
  ],
  taco: [
    'https://images.unsplash.com/photo-1604467794349-0b74285de7e7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512058454905-6b841e7ad132?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1604467794349-0b74285de7e7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512058454905-6b841e7ad132?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1604467794349-0b74285de7e7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=400&h=300&fit=crop',
  ],
  pizza: [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1548369937-47519962c11a?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=400&h=300&fit=crop',
  ],
  rice: [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1536304993881-ff86e0c9b9a3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512058556646-c4da40fba323?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop',
  ],
  bread: [
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555951015-6da899b373e9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1534620808146-d33bb39851f7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&h=300&fit=crop',
  ],
  avocado: [
    'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600850056064-a8b380df8395?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1548940740-204726a19be3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1587334207827-b5c4a9ffe0b7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=400&h=300&fit=crop',
  ],
  seafood: [
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1497888329096-51c27beff665?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1611599537845-1c7aca0091c0?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
  ],
  pork: [
    'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1602470521006-aaea8b2b9b57?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571197119738-27e1ee042ac0?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607116667981-ff5f7481a510?w=400&h=300&fit=crop',
  ],
  lamb: [
    'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607116667981-ff5f7481a510?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop',
  ],
  tofu: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400&h=300&fit=crop',
  ],
  curry: [
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop',
  ],
  steak: [
    'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607116667981-ff5f7481a510?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1579954115563-e72bf1381629?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559181567-c3190ca9be46?w=400&h=300&fit=crop',
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1550317138-10000687a72b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?w=400&h=300&fit=crop',
  ],
  roast: [
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571197119738-27e1ee042ac0?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=300&fit=crop',
  ],
  bacon_egg: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1484723091739-30acafafc9de?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
  ],
  shrimp: [
    'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1485704686097-ed47f7263ca4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1611599537845-1c7aca0091c0?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1497888329096-51c27beff665?w=400&h=300&fit=crop',
  ],
  noodles: [
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567608285969-48e4bbe0d399?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=300&fit=crop',
  ],
  meatball: [
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1607116667981-ff5f7481a510?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1615937657715-bc7b4b7962c1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&h=300&fit=crop',
  ],
  default: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
  ],
};

// Maps the query string produced by extractFoodKeyword() back to an IMAGE_POOLS key.
// Queries not listed here fall through to 'default'.
const QUERY_TO_POOL_KEY: Record<string, string> = {
  'salmon fillet dish':  'salmon',
  'tuna dish':           'salmon',   // similar fish
  'shrimp prawns dish':  'shrimp',
  'seafood dish':        'seafood',
  'chicken dish cooked': 'chicken',
  'turkey dish':         'chicken',  // similar poultry
  'beef meat dish':      'beef',
  'steak grilled':       'steak',
  'meatballs dish':      'meatball',
  'sausage dish':        'pork',
  'bacon dish':          'pork',
  'lamb dish':           'lamb',
  'pork dish':           'pork',
  'tofu dish':           'tofu',
  'pasta dish':          'pasta',
  'noodles dish':        'noodles',
  'risotto dish':        'pasta',
  'curry dish':          'curry',
  'salad bowl fresh':    'salad',
  'vegan food healthy':  'salad',
  'vegetarian food':     'salad',
  'soup bowl':           'soup',
  'stew bowl':           'soup',
  'sandwich food':       'sandwich',
  'wrap food':           'sandwich',
  'burger food':         'burger',
  'tacos mexican food':  'taco',
  'pizza dish':          'pizza',
  'rice dish':           'rice',
  'stir fry asian':      'rice',
  'roast dish':          'roast',
  'eggs breakfast':      'bacon_egg',
  'omelette eggs':       'bacon_egg',
  'avocado dish':        'avocado',
  'flatbread':           'bread',
  'bruschetta':          'bread',
  'focaccia bread':      'bread',
  'toast bread':         'bread',
  'dessert sweet':       'dessert',
  'food dish meal':      'default',
  // remaining keywords fall to 'default'
};

function getImagePool(query: string, size: '400x300' | '800x400'): string[] {
  const key  = QUERY_TO_POOL_KEY[query] ?? 'default';
  const base = IMAGE_POOLS[key] ?? IMAGE_POOLS['default'];
  // For large hero images, swap the dimensions in every URL
  if (size === '800x400') {
    return base.map((u) => u.replace('w=400&h=300', 'w=800&h=400'));
  }
  return base;
}

// ─── Step 3: Stable pool index from recipe title hash ─────────────────────────
//
// Equivalent to Python:
//   name_hash = sum(ord(c) for c in recipe_name)
//   index = (name_hash + recipe_index) % pool_size
//
// `recipeIndex` (optional loop index) shifts the hash so two recipes that
// happen to produce the same sum still land on different images.

function titleHash(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h += title.charCodeAt(i);
  return h;
}

function pickFromPool(pool: string[], title: string, recipeIndex = 0): string {
  const idx = (titleHash(title) + recipeIndex) % pool.length;
  return pool[idx];
}

// ─── Public API ───────────────────────────────────────────────────────────────
//
// Both functions share the same contract:
//   1. If imageUrl is a genuine source URL → return it unchanged (no DB writes).
//   2. Otherwise → extract a food keyword, build a pool, pick stably by title hash.
//
// `recipeIndex` is optional. Pass the 0-based loop index when rendering a grid
// so that two recipes with identical titles (rare) still get different images.

export function getRecipeImage(
  title: string,
  imageUrl?: string | null,
  recipeIndex = 0,
): string {
  if (isValidSourceImage(imageUrl)) return imageUrl!;
  const query = extractFoodKeyword(title);
  const pool  = getImagePool(query, '400x300');
  return pickFromPool(pool, title, recipeIndex);
}

export function getRecipeImageLarge(
  title: string,
  imageUrl?: string | null,
  recipeIndex = 0,
): string {
  if (isValidSourceImage(imageUrl)) return imageUrl!;
  const query = extractFoodKeyword(title);
  const pool  = getImagePool(query, '800x400');
  return pickFromPool(pool, title, recipeIndex);
}
