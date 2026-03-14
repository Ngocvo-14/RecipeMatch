import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';
import { sampleRecipes } from '@/lib/seedData';
import { calculateRecipeCost } from '@/lib/costCalculator';

export async function POST() {
  try {
    await connectDB();

    // Clear existing recipes
    await Recipe.deleteMany({});

    // Recalculate costs before inserting
    const recipesWithCosts = sampleRecipes.map((r) => ({
      ...r,
      estimatedCost: calculateRecipeCost(r.ingredients),
    }));

    const inserted = await Recipe.insertMany(recipesWithCosts);

    return NextResponse.json({
      message: `Successfully seeded ${inserted.length} recipes`,
      count: inserted.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const count = await Recipe.countDocuments();
    const withNutrition = await Recipe.countDocuments({ 'nutrition.calories': { $gt: 0 } });
    const hasNutrition = withNutrition > 0;
    // Detect stale costs: if >30% of recipes still have the old $8 default, costs need fixing
    const withDefaultCost = await Recipe.countDocuments({ estimatedCost: 8 });
    const hasCorrectCosts = count === 0 || withDefaultCost < count * 0.3;
    return NextResponse.json({ message: `Database has ${count} recipes`, count, hasNutrition, hasCorrectCosts });
  } catch (error) {
    console.error('Seed check error:', error);
    return NextResponse.json({ error: 'Failed to check database' }, { status: 500 });
  }
}
