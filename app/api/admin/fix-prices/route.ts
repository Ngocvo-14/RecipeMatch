import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';
import { calculateRecipeCost } from '@/lib/costCalculator';

/**
 * POST /api/admin/fix-prices
 * Migrates all recipes that still have the stale $8 default (or no cost)
 * by recalculating their estimated cost from their actual ingredients.
 */
export async function POST() {
  try {
    await connectDB();

    // Find recipes that still have the old default cost or no cost at all
    const stale = await Recipe.find({
      $or: [
        { estimatedCost: 8 },
        { estimatedCost: { $exists: false } },
        { estimatedCost: null },
      ],
    }).lean();

    if (stale.length === 0) {
      return NextResponse.json({ message: 'All prices are already correct', updated: 0 });
    }

    const updates = stale.map((r) =>
      Recipe.updateOne(
        { _id: r._id },
        { $set: { estimatedCost: calculateRecipeCost(r.ingredients as { name?: string; category?: string }[]) } }
      )
    );

    await Promise.all(updates);

    return NextResponse.json({
      message: `Fixed prices for ${stale.length} recipes`,
      updated: stale.length,
    });
  } catch (error) {
    console.error('Fix-prices error:', error);
    return NextResponse.json({ error: 'Failed to fix prices' }, { status: 500 });
  }
}

/** GET returns how many recipes still need fixing (diagnostic) */
export async function GET() {
  try {
    await connectDB();
    const staleCount = await Recipe.countDocuments({
      $or: [{ estimatedCost: 8 }, { estimatedCost: { $exists: false } }, { estimatedCost: null }],
    });
    return NextResponse.json({ staleCount });
  } catch {
    return NextResponse.json({ error: 'Failed to check prices' }, { status: 500 });
  }
}
