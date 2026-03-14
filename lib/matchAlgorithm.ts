import { IRecipe } from '@/models/Recipe';
import { MatchedRecipe } from '@/types';

// Words assumed to be in every pantry — not counted when scoring
const ASSUMED_WORDS = new Set([
  'salt', 'pepper', 'water', 'oil', 'olive', 'vegetable', 'canola',
  'black', 'white', 'sea', 'kosher', 'taste',
]);

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

// Words that fundamentally change the ingredient type.
// If the recipe ingredient has one of these AND the user's ingredient doesn't, don't match.
// e.g. "cream" should NOT match "ice cream" or "sour cream" unless user has "ice" / "sour" too.
const STRONG_QUALIFIERS = new Set([
  'ice', 'sour', 'sweet', 'almond', 'oat', 'coconut', 'condensed',
  'evaporated', 'skim', 'cream',   // "cream cheese" — "cream" qualifies "cheese"
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

// Two words match if their stems are equal.
// Prefix matching is intentionally restricted (max 3-char length difference) to prevent
// "bread" matching "breadcrumb" while still allowing plural stems like "tomat"/"tomato".
function wordsMatch(a: string, b: string): boolean {
  const sa = stem(a);
  const sb = stem(b);
  if (sa === sb) return true;
  // Allow prefix only when the difference is tiny (≤3 chars) — handles residual stem mismatches
  const lenDiff = Math.abs(sa.length - sb.length);
  const minLen = Math.min(sa.length, sb.length);
  if (minLen >= 4 && lenDiff <= 3 && (sa.startsWith(sb) || sb.startsWith(sa))) return true;
  return false;
}

// True when every token of the user's ingredient word-matches some token in the recipe ingredient.
// Also enforces STRONG_QUALIFIERS: if the recipe ingredient has a strong qualifier (e.g. "ice" in
// "ice cream" or "sour" in "sour cream"), the user's ingredient must include that qualifier too.
function ingredientsMatch(userIngredient: string, recipeIngredientName: string): boolean {
  const userTokens = tokenize(userIngredient);
  const recipeTokens = tokenize(recipeIngredientName);
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

export function matchRecipes(
  userIngredients: string[],
  recipes: IRecipe[]
): MatchedRecipe[] {
  const normalizedUser = userIngredients
    .map((i) => i.toLowerCase().trim())
    .filter(Boolean);

  const matched: MatchedRecipe[] = [];

  for (const recipe of recipes) {
    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];
    let userMatchedCount = 0; // non-assumed ingredients matched by user

    for (const ing of recipe.ingredients) {
      const ingName = ing.name.toLowerCase().trim();
      const assumed = isAssumedIngredient(ingName);
      const hasIt = assumed || normalizedUser.some((ui) => ingredientsMatch(ui, ingName));

      if (hasIt) {
        matchedIngredients.push(ingName);
        if (!assumed) userMatchedCount++;
      } else {
        missingIngredients.push(ingName);
      }
    }

    // Skip recipes where none of the user's actual ingredients match
    if (userMatchedCount === 0) continue;

    const total = recipe.ingredients.length;
    const matchScore = total > 0 ? matchedIngredients.length / total : 0;

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
