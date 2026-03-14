/**
 * One-time script to populate MongoDB with real recipes from TheMealDB.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/recipes/fetch-real
 *
 * Or to run directly (requires ts-node + dotenv):
 *   npx ts-node -r tsconfig-paths/register scripts/fetchRealRecipes.ts
 */

// This script is intentionally thin — the real logic lives in the API route.
// Call the fetch-real endpoint instead:
console.log('To fetch real recipes, call the API endpoint:');
console.log('  curl -X POST http://localhost:3000/api/recipes/fetch-real');
console.log('');
console.log('This will:');
console.log('  1. Fetch up to 20 meals from each TheMealDB category');
console.log('  2. Transform them to the RecipeMatch schema');
console.log('  3. Upsert into MongoDB (safe to run multiple times)');
console.log('  4. Return a summary of saved/failed counts');
