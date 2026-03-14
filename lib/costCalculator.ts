/** Cost per ingredient by category */
const CATEGORY_COSTS: Record<string, number> = {
  Proteins: 5.00,
  Dairy: 1.50,
  Produce: 1.25,
  Grains: 1.00,
  Canned: 1.75,
  Condiments: 0.75,
  Sauces: 0.75,
  Oils: 0.50,
  Pantry: 0.50,
  Spices: 0.40,
};

/**
 * Calculate realistic estimated cost for a recipe based on its ingredients.
 * Returns total ingredient cost rounded to the nearest dollar, clamped to $2–$30.
 */
export function calculateRecipeCost(
  ingredients: { name?: string; category?: string }[]
): number {
  const total = ingredients.reduce((sum, ing) => {
    const cost = CATEGORY_COSTS[ing.category ?? ''] ?? 1.00;
    return sum + cost;
  }, 0);

  return Math.max(2, Math.min(30, Math.round(total)));
}
