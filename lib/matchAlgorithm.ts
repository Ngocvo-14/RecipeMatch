import { IRecipe } from '@/models/Recipe';
import { MatchedRecipe } from '@/types';

// Only the most universally available ingredients are silently assumed.
// They do NOT appear as green checkmarks — they are quietly excluded from missingIngredients
// and placed in assumedIngredients so the UI can show them neutrally.
// Oils, butter, garlic, onion etc. are NOT assumed — users must add them explicitly.
const ASSUMED_WORDS = new Set(['salt', 'pepper', 'water']);

// Measurement units and generic modifiers stripped from ingredient names
const SKIP_WORDS = new Set([
  'cup', 'cups', 'tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
  'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams',
  'kg', 'ml', 'liter', 'liters', 'pint', 'pints', 'quart', 'quarts', 'gallon',
  'clove', 'cloves', 'bunch', 'handful', 'pinch', 'dash', 'slice', 'slices',
  'piece', 'pieces', 'can', 'cans', 'package', 'packages',
  'large', 'medium', 'small', 'fresh', 'dried', 'chopped', 'diced', 'minced',
  'sliced', 'grated', 'shredded', 'cooked', 'raw', 'crushed',
  'peeled', 'seeded', 'boneless', 'skinless', 'lean', 'thick', 'thin',
  'to', 'and', 'or', 'of', 'with', 'in',
]);

// External APIs (Edamam etc.) sometimes split compound ingredient words with a space.
// Normalise these before tokenising so "egg plants" doesn't match "egg".
const COMPOUND_FIXES: [RegExp, string][] = [
  [/\begg\s+plants?\b/gi,         'eggplant'],
  [/\bpine\s+apples?\b/gi,        'pineapple'],
  [/\bwater\s+melon\b/gi,         'watermelon'],
  [/\bgrape\s+fruit\b/gi,         'grapefruit'],
  [/\bblack\s+berr(y|ies)\b/gi,   'blackberry'],
  [/\bblue\s+berr(y|ies)\b/gi,    'blueberry'],
  [/\bstraw\s+berr(y|ies)\b/gi,   'strawberry'],
  [/\bsun\s+flower\b/gi,          'sunflower'],
  [/\bchick\s+peas?\b/gi,         'chickpea'],
  [/\bsoy\s+beans?\b/gi,          'soybean'],
];

function normalizeCompounds(text: string): string {
  let s = text;
  for (const [re, fix] of COMPOUND_FIXES) s = s.replace(re, fix);
  return s;
}

// Words that fundamentally change the ingredient type.
// If the recipe ingredient has one of these AND the user's ingredient doesn't, don't match.
// e.g. "cream" should NOT match "ice cream" or "sour cream" unless user has "ice" / "sour" too.
const STRONG_QUALIFIERS = new Set([
  'ice', 'sour', 'sweet', 'almond', 'oat', 'coconut', 'condensed',
  'evaporated', 'skim', 'cream',   // "cream cheese" — "cream" qualifies "cheese"
]);

// Recipe ingredient categories that are condiments/spices/oils/seasonings — never primary.
// A recipe only appears if the user matches at least one ingredient NOT in these categories.
const NON_PRIMARY_CATEGORIES = new Set([
  'Condiments', 'Spices', 'Oils', 'Herbs', 'Baking', 'Seasonings', 'Sauces',
]);

// Text-based non-primary list used when an ingredient has no category.
// Covers condiments, spices, oils, herbs, basic pantry staples and sweeteners.
const NON_PRIMARY_WORDS = new Set([
  // oils & fats
  'oil', 'olive oil', 'vegetable oil', 'sesame oil', 'canola oil', 'sunflower oil',
  'coconut oil', 'peanut oil', 'cooking spray', 'nonstick spray',
  // soy-based & umami sauces
  'soy sauce', 'tamari', 'fish sauce', 'oyster sauce', 'hoisin sauce',
  'worcestershire sauce', 'worcestershire', 'teriyaki sauce', 'ponzu',
  // condiments & vinegars
  'hot sauce', 'sriracha', 'ketchup', 'mustard', 'dijon mustard', 'mayonnaise',
  'mayo', 'vinegar', 'rice vinegar', 'balsamic vinegar', 'apple cider vinegar',
  'white vinegar', 'red wine vinegar', 'mirin',
  // acids / juices used as seasoning
  'lemon juice', 'lime juice', 'orange juice',
  // dry spices & seasonings
  'salt', 'pepper', 'black pepper', 'white pepper', 'sea salt', 'kosher salt',
  'garlic powder', 'onion powder', 'paprika', 'smoked paprika',
  'cumin', 'oregano', 'thyme', 'basil', 'rosemary', 'sage', 'marjoram',
  'coriander', 'turmeric', 'cinnamon', 'nutmeg', 'cayenne', 'cayenne pepper',
  'chili powder', 'chilli powder', 'red pepper flakes', 'chili flakes',
  'bay leaf', 'bay leaves', 'cardamom', 'allspice', 'star anise',
  'fennel seed', 'caraway', 'five spice', 'garam masala', 'curry powder',
  'italian seasoning', 'mixed herbs', 'dried herbs', 'seasoning',
  'mustard seed', 'poppy seed', 'sesame seed', 'sesame seeds',
  // fresh herbs (flavour accent, not a primary ingredient)
  'parsley', 'cilantro', 'mint', 'dill', 'chive', 'chives', 'tarragon',
  // sugars & sweeteners
  'sugar', 'brown sugar', 'white sugar', 'powdered sugar', 'icing sugar',
  'honey', 'maple syrup', 'agave', 'molasses', 'corn syrup', 'simple syrup',
  // baking staples
  'flour', 'all purpose flour', 'bread flour', 'cornstarch', 'corn starch', 'cornflour',
  'baking soda', 'baking powder', 'yeast', 'breadcrumbs', 'bread crumbs', 'panko',
  'vanilla', 'vanilla extract', 'cocoa powder', 'chocolate chips',
  // liquids used as base/seasoning, not as a primary component
  'water', 'broth', 'stock', 'chicken broth', 'beef broth', 'vegetable broth',
  'chicken stock', 'beef stock', 'vegetable stock', 'dashi', 'bouillon',
  // other pantry flavourings
  'soy', 'miso', 'tahini', 'harissa', 'sambal',
]);

// Improved plural stemmer that preserves the base form correctly
function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ies')) return word.slice(0, -3) + 'y'; // berries→berry
  if (word.length > 4 && word.endsWith('ves')) return word.slice(0, -3) + 'f'; // halves→half
  // -oes plurals: tomatoes→tomato, potatoes→potato (strip 'es', add 'o' back)
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2) + 'o'; // tomatoes→tomato
  // General -es: strip only 's' to preserve the 'e' (spices→spice, bales→bale)
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -1);        // spices→spice
  if (word.length > 3 && word.endsWith('s'))  return word.slice(0, -1);        // eggs→egg
  return word;
}

// Split into meaningful words, strip units/modifiers
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !SKIP_WORDS.has(w));
}

// True when ALL tokens of the ingredient are assumed-pantry words
function isAssumedIngredient(name: string): boolean {
  const tokens = tokenize(name);
  if (tokens.length === 0) return true;
  return tokens.every((t) => ASSUMED_WORDS.has(t) || ASSUMED_WORDS.has(stem(t)));
}

// Two words match only when their stems are exactly equal (whole-word matching).
// Prefix matching is intentionally removed to prevent "egg" matching "eggplant",
// "bread" matching "breadcrumbs", etc.
function wordsMatch(a: string, b: string): boolean {
  return stem(a) === stem(b);
}

// True when every token of the user's ingredient word-matches some token in the recipe ingredient.
// Also enforces STRONG_QUALIFIERS: if the recipe ingredient has a strong qualifier (e.g. "ice" in
// "ice cream" or "sour" in "sour cream"), the user's ingredient must include that qualifier too.
// Both sides are compound-normalised first so "egg plants" → "eggplant" before tokenising.
function ingredientsMatch(userIngredient: string, recipeIngredientName: string): boolean {
  const userTokens = tokenize(normalizeCompounds(userIngredient));
  const recipeTokens = tokenize(normalizeCompounds(recipeIngredientName));
  if (userTokens.length === 0 || recipeTokens.length === 0) return false;

  // Strong-qualifier guard: prevent "cream" matching "ice cream", "potato" matching "sweet potato"
  if (recipeTokens.length >= 2) {
    const qualifiers = recipeTokens.filter((t) => STRONG_QUALIFIERS.has(t));
    if (qualifiers.length > 0) {
      const userHasQualifier = qualifiers.every((q) =>
        userTokens.some((ut) => wordsMatch(ut, q))
      );
      if (!userHasQualifier) return false;
    }
  }

  return userTokens.every((ut) => recipeTokens.some((rt) => wordsMatch(ut, rt)));
}

// Returns true when a recipe ingredient is a "primary" ingredient (protein, vegetable, grain,
// dairy, canned good) rather than a condiment, spice, oil, herb, or basic pantry staple.
// Uses the ingredient's category when available; falls back to a text-based lookup.
function isPrimaryIngredient(ingName: string, category?: string): boolean {
  if (category && NON_PRIMARY_CATEGORIES.has(category)) return false;
  if (!category) {
    const lower = ingName.toLowerCase().trim();
    // Check full name first, then individual tokens
    if (NON_PRIMARY_WORDS.has(lower)) return false;
    const tokens = tokenize(lower);
    // Slide a window of 1–3 tokens and check each n-gram.
    // Handles quantity-prefixed and adjective-prefixed ingredient names:
    //   "1/4 cup soy sauce"  → tokens ["soy","sauce"]     → "soy sauce" ✓
    //   "1 tbsp light soy sauce" → tokens ["light","soy","sauce"] → "soy sauce" ✓
    //   "3 tbsp extra virgin olive oil" → tokens ["extra","virgin","olive","oil"] → "olive oil" ✓
    for (let len = 3; len >= 1; len--) {
      for (let i = 0; i + len <= tokens.length; i++) {
        if (NON_PRIMARY_WORDS.has(tokens.slice(i, i + len).join(' '))) return false;
      }
    }
    if (tokens.every((t) => NON_PRIMARY_WORDS.has(t) || NON_PRIMARY_WORDS.has(stem(t)))) {
      return false;
    }
  }
  return true;
}

export function matchRecipes(
  userIngredients: string[],
  recipes: IRecipe[]
): MatchedRecipe[] {
  const normalizedUser = userIngredients
    .map((i) => i.toLowerCase().trim())
    .filter(Boolean);

  const matched: MatchedRecipe[] = [];

  for (const recipe of recipes) {
    const matchedIngredients: string[] = [];   // user-provided matches → green checkmark
    const assumedIngredients: string[] = [];   // salt/pepper/water → silent, neutral indicator
    const missingIngredients: string[] = [];   // user doesn't have → empty circle
    let userMatchedCount = 0;   // non-assumed ingredients matched by user
    let primaryMatchCount = 0;  // matched ingredients that are primary (protein/veg/grain/dairy)

    for (const ing of recipe.ingredients) {
      const ingName = ing.name.toLowerCase().trim();
      const assumed = isAssumedIngredient(ingName);

      if (assumed) {
        // Silently cover salt/pepper/water — not green, not missing
        assumedIngredients.push(ingName);
      } else if (normalizedUser.some((ui) => ingredientsMatch(ui, ingName))) {
        matchedIngredients.push(ingName);
        userMatchedCount++;
        if (isPrimaryIngredient(ing.name, ing.category)) primaryMatchCount++;
      } else {
        missingIngredients.push(ingName);
      }
    }

    // Skip recipes where the user has no matches at all
    if (userMatchedCount === 0) continue;

    // Skip recipes where user only matched condiments/spices/oils — no primary ingredient match
    if (primaryMatchCount === 0) continue;

    // Score counts matched + assumed so salt/pepper don't penalise recipes
    const total = recipe.ingredients.length;
    const effectiveMatched = matchedIngredients.length + assumedIngredients.length;
    const matchScore = total > 0 ? effectiveMatched / total : 0;

    let matchType: 'full' | 'near' | 'low';
    if (missingIngredients.length === 0) {
      matchType = 'full';
    } else if (missingIngredients.length <= 2) {
      matchType = 'near';
    } else {
      matchType = 'low';
    }

    matched.push({
      _id: (recipe._id as unknown as { toString(): string }).toString(),
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      mealType: recipe.mealType,
      difficulty: recipe.difficulty,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      tags: recipe.tags,
      diet: recipe.diet,
      equipment: recipe.equipment,
      estimatedCost: recipe.estimatedCost,
      nutrition: recipe.nutrition,
      imageUrl: recipe.imageUrl,
      source: recipe.source,
      videoUrl: recipe.videoUrl,
      matchScore,
      matchType,
      matchedIngredients,
      assumedIngredients,
      missingIngredients,
    });
  }

  // Sort: full → near → low; within group by score desc
  return matched.sort((a, b) => {
    const order = { full: 0, near: 1, low: 2 };
    if (order[a.matchType] !== order[b.matchType]) {
      return order[a.matchType] - order[b.matchType];
    }
    return b.matchScore - a.matchScore;
  });
}
