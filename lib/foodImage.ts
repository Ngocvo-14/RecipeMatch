function hashTitle(title: string): number {
  return Math.abs(title.split('').reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0));
}
function pick<T>(arr: T[], seed: string): T {
  return arr[hashTitle(seed) % arr.length];
}

interface FoodPool { keywords: string[]; urls: string[]; }

// All URLs confirmed working (HTTP 200, image/jpeg) as of 2026-03-15
const POOLS: FoodPool[] = [
  // PASTA
  { keywords: ['spaghetti bolognese','bolognese'], urls: ['https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'] },
  { keywords: ['spaghetti taco','spaghetti tacos'], urls: ['https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg'] },
  { keywords: ['carbonara'], urls: ['https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'] },
  { keywords: ['lasagna','lasagne'], urls: ['https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg'] },
  { keywords: ['mac and cheese','mac & cheese','macaroni and cheese','macaroni cheese'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['chicken alfredo','fettuccine alfredo','pasta alfredo'], urls: ['https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'] },
  { keywords: ['seafood cannelloni','cannelloni'], urls: ['https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg'] },
  { keywords: ['pasta','spaghetti','penne','rigatoni','linguine','tagliatelle','fettuccine','macaroni','gnocchi','orzo'], urls: ['https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg','https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg','https://www.themealdb.com/images/media/meals/wtsvxx1511296896.jpg'] },

  // NOODLES
  { keywords: ['pad thai'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['ramen'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'] },
  { keywords: ['tom yum','tom kha'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'] },
  { keywords: ['miso noodle','miso soup','seafood miso noodle'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'] },
  { keywords: ['pho','udon','soba','lo mein','chow mein','noodle soup','noodle'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg','https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },

  // TACOS & MEXICAN
  { keywords: ['walking taco','walking tacos'], urls: ['https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'] },
  { keywords: ['tarantula taco','tarantula tacos'], urls: ['https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'] },
  { keywords: ['keto taco','keto burger'], urls: ['https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'] },
  { keywords: ['taco','burrito','enchilada','fajita','quesadilla','nachos'], urls: ['https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg','https://www.themealdb.com/images/media/meals/n3xxd91598732796.jpg'] },

  // BEEF
  { keywords: ['beef wellington'], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['beef bourguignon','boeuf bourguignon'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['beef stroganoff','stroganoff'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['beef stew','pot roast','beef pot'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['burger','hamburger','cheeseburger','smash burger'], urls: ['https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg'] },
  { keywords: ['steak','ribeye','sirloin','t-bone','filet mignon'], urls: ['https://www.themealdb.com/images/media/meals/qtwtss1468572261.jpg','https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['meatball'], urls: ['https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg'] },
  { keywords: ['meatloaf'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['ground beef','beef mince','minced beef'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg','https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg'] },
  { keywords: ['beef'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg','https://www.themealdb.com/images/media/meals/qtwtss1468572261.jpg','https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg'] },

  // CHICKEN
  { keywords: ['chicken tikka masala','tikka masala'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['butter chicken','murgh makhani'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['chicken parmesan','chicken parmigiana','chicken parm'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['fried chicken','chicken wing','crispy chicken','chicken tender'], urls: ['https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg'] },
  { keywords: ['roast chicken','whole chicken','rotisserie'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['chicken curry'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['chicken soup','chicken noodle','chicken broth'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'] },
  { keywords: ['chicken'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg','https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg','https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },

  // PORK
  { keywords: ['crown roast of pork','crown roast pork','crown roast'], urls: ['https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg'] },
  { keywords: ['grilled pork chop','pork chop','pork chops'], urls: ['https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg'] },
  { keywords: ['pork schnitzel','schnitzel'], urls: ['https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg'] },
  { keywords: ['pulled pork','pork belly','carnitas'], urls: ['https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg'] },
  { keywords: ['bacon'], urls: ['https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg'] },
  { keywords: ['sausage','bratwurst','chorizo','hot dog'], urls: ['https://www.themealdb.com/images/media/meals/sqrtwu1511721265.jpg'] },
  { keywords: ['pork'], urls: ['https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg','https://www.themealdb.com/images/media/meals/sqrtwu1511721265.jpg'] },

  // SEAFOOD
  { keywords: ['seafood paella','shrimp paella'], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['paella'], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['seafood cocktail','prawn cocktail','shrimp cocktail'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['hearty seafood gumbo','seafood gumbo'], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['seafood stew','seafood chowder','seafood risotto',"dad's favorite seafood"], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['garlic butter shrimp','shrimp scampi','garlic shrimp'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['shrimp fried rice'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['shrimp and grits','shrimp grits','shrimp & grits'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['shrimp pepperoncini','shrimp & pepperoncini'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['shrimp','prawn'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['salmon'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['tuna'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['fish and chips'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['fish','cod','tilapia','halibut','sea bass','mahi','trout','haddock'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['lobster','crab','scallop','clam','mussel','oyster'], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['seafood'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg','https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },

  // LAMB
  { keywords: ["shepherd's pie",'shepherds pie'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['rack of lamb','lamb chop','lamb chops'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['moussaka'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['lamb','mutton'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },

  // RICE & GRAINS
  { keywords: ['bibimbap'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['fried rice','rice bowl','rice pilaf'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg'] },
  { keywords: ['biryani','pilau','pilaf'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['risotto'], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['rice'], urls: ['https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg','https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },

  // EGGS & BREAKFAST
  { keywords: ['eggs benedict'], urls: ['https://www.themealdb.com/images/media/meals/1550441882.jpg'] },
  { keywords: ['french toast'], urls: ['https://www.themealdb.com/images/media/meals/1550441882.jpg'] },
  { keywords: ['egg foo young','foo young'], urls: ['https://www.themealdb.com/images/media/meals/1550441882.jpg'] },
  { keywords: ['omelette','omelet','frittata','quiche','scrambled egg'], urls: ['https://www.themealdb.com/images/media/meals/1550441882.jpg'] },
  { keywords: ['pancake','waffle','crepe'], urls: ['https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg'] },
  { keywords: ['egg'], urls: ['https://www.themealdb.com/images/media/meals/1550441882.jpg'] },

  // SOUP & STEW
  { keywords: ['french onion soup'], urls: ['https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'] },
  { keywords: ['clam chowder','new england chowder','corn chowder'], urls: ['https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'] },
  { keywords: ['chicken soup','chicken noodle soup'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'] },
  { keywords: ['gumbo'], urls: ['https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg'] },
  { keywords: ['chili','chile'], urls: ['https://www.themealdb.com/images/media/meals/svprys1511176755.jpg'] },
  { keywords: ['bisque'], urls: ['https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'] },
  { keywords: ['minestrone','lentil soup','vegetable soup'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg'] },
  { keywords: ['soup','stew','broth','potage','chowder'], urls: ['https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg','https://www.themealdb.com/images/media/meals/rvtvuw1511190488.jpg'] },

  // SALAD
  { keywords: ['caesar salad'], urls: ['https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg'] },
  { keywords: ['green salad','detox salad','lunch salad','garden salad','salad'], urls: ['https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg','https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'] },

  // VEGETARIAN
  { keywords: ['stuffed bell pepper','stuffed pepper'], urls: ['https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'] },
  { keywords: ['vegetarian meatloaf','vegan meatloaf'], urls: ['https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'] },
  { keywords: ['stir fry','stir-fry'], urls: ['https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'] },
  { keywords: ['avocado toast','avocado salad'], urls: ['https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg'] },
  { keywords: ['guacamole','avocado'], urls: ['https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg'] },
  { keywords: ['vegetable','veggie','broccoli','cauliflower','asparagus','bell pepper','zucchini','eggplant'], urls: ['https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg'] },

  // PIZZA
  { keywords: ['pizza','flatbread','calzone'], urls: ['https://www.themealdb.com/images/media/meals/x0lk931587671540.jpg'] },

  // CURRY & INDIAN
  { keywords: ['jamaican curry','jamaican jerk'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['curry','korma','vindaloo','saag','palak','dal','dhal','lentil curry'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['naan','roti','chapati','paratha'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },

  // ASIAN
  { keywords: ['korean bbq','bulgogi'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['kimchi'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['sushi','maki','nigiri','hand roll'], urls: ['https://www.themealdb.com/images/media/meals/g046bb1663960946.jpg'] },
  { keywords: ['dumpling','gyoza','potsticker','wonton','dim sum'], urls: ['https://www.themealdb.com/images/media/meals/1525876468.jpg'] },
  { keywords: ['teriyaki','yakitori'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },
  { keywords: ['korean'], urls: ['https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg'] },

  // SANDWICH
  { keywords: ['sandwich','sub','hoagie','panini','club sandwich'], urls: ['https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg'] },
  { keywords: ['wrap','tortilla wrap'], urls: ['https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg'] },

  // DESSERTS
  { keywords: ['chocolate brownie','brownie'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['chocolate cake'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['cheesecake'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['apple pie','cherry pie','blueberry pie'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['cookie','biscuit'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['cupcake','muffin'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['ice cream','gelato','sorbet'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['donut','doughnut','churro'], urls: ['https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg'] },
  { keywords: ['chocolate'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['cake','tart','cobbler','pie'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg'] },
  { keywords: ['dessert','pudding','sweet','treat'], urls: ['https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg','https://www.themealdb.com/images/media/meals/rwuyqx1511383174.jpg'] },
];

const GENERIC_POOL = [
  'https://www.themealdb.com/images/media/meals/sutysw1468247559.jpg',
  'https://www.themealdb.com/images/media/meals/wyxwsp1486979827.jpg',
  'https://www.themealdb.com/images/media/meals/svprys1511176755.jpg',
  'https://www.themealdb.com/images/media/meals/wruvqv1511880994.jpg',
  'https://www.themealdb.com/images/media/meals/vvpprx1487325699.jpg',
  'https://www.themealdb.com/images/media/meals/xxpqsy1511452222.jpg',
  'https://www.themealdb.com/images/media/meals/rvxxuy1468312893.jpg',
  'https://www.themealdb.com/images/media/meals/urtwux1486983078.jpg',
  'https://www.themealdb.com/images/media/meals/sytuqu1511553755.jpg',
  'https://www.themealdb.com/images/media/meals/uvuyxu1503067369.jpg',
  'https://www.themealdb.com/images/media/meals/uuuspp1511297945.jpg',
  'https://www.themealdb.com/images/media/meals/xvsurr1511719182.jpg',
];

export function getFoodImageUrl(title: string, ingredients?: string[]): string {
  const titleLower = title.toLowerCase();

  // Collect ALL matches from title, then sort by keyword length DESC (longer = more specific)
  const matches: Array<{ urls: string[]; score: number }> = [];

  for (const entry of POOLS) {
    for (const keyword of entry.keywords) {
      if (titleLower.includes(keyword)) {
        matches.push({ urls: entry.urls, score: keyword.length });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);

  if (matches.length > 0) {
    return pick(matches[0].urls, title);
  }

  // Fallback: try ingredients for clues (long keywords only to avoid false matches)
  if (ingredients && ingredients.length > 0) {
    const ingText = ingredients.slice(0, 5).join(' ').toLowerCase();
    const ingMatches: Array<{ urls: string[]; score: number }> = [];
    for (const entry of POOLS) {
      for (const keyword of entry.keywords) {
        if (keyword.length >= 6 && ingText.includes(keyword)) {
          ingMatches.push({ urls: entry.urls, score: keyword.length });
        }
      }
    }
    ingMatches.sort((a, b) => b.score - a.score);
    if (ingMatches.length > 0) return pick(ingMatches[0].urls, title);
  }

  return pick(GENERIC_POOL, title);
}
