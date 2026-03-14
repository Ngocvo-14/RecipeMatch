import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';
import { matchRecipes } from '@/lib/matchAlgorithm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ingredients, filters } = body as {
      ingredients: string[];
      filters?: {
        mealType?: string;
        cuisine?: string;
        diet?: string;
        maxCookTime?: number;
        equipment?: string;
        tags?: string[];
      };
    };

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one ingredient' },
        { status: 400 }
      );
    }

    await connectDB();

    // Build query based on filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};

    if (filters?.mealType && filters.mealType !== 'All') {
      query.mealType = filters.mealType;
    }
    if (filters?.cuisine && filters.cuisine !== 'All') {
      query.cuisine = filters.cuisine;
    }
    if (filters?.diet && filters.diet !== 'All') {
      query.diet = { $in: [filters.diet] };
    }
    if (filters?.maxCookTime) {
      query.cookTime = { $lte: filters.maxCookTime };
    }
    if (filters?.equipment && filters.equipment !== 'All') {
      query.equipment = { $in: [filters.equipment] };
    }
    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    const recipes = await Recipe.find(query).lean();
    const matched = matchRecipes(ingredients, recipes as Parameters<typeof matchRecipes>[1]);

    // Deduplicate by title — catches same recipe inserted twice with different _ids
    const deduped = [...new Map(matched.map((r) => [r.title.toLowerCase(), r])).values()];

    const fullMatches = deduped.filter((r) => r.matchType === 'full');
    const nearMatches = deduped.filter((r) => r.matchType === 'near');
    const lowMatches = deduped.filter((r) => r.matchType === 'low');

    return NextResponse.json({
      total: matched.length,
      cookableCount: fullMatches.length + nearMatches.length,
      fullMatches,
      nearMatches,
      lowMatches,
    });
  } catch (error) {
    console.error('Match error:', error);
    return NextResponse.json({ error: 'Failed to match recipes' }, { status: 500 });
  }
}
