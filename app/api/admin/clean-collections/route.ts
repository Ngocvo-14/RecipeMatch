import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Collection from '@/models/Collection';

const DEFAULT_NAMES = [
  'Favorites', 'Breakfast', 'Lunch', 'Dinner',
  'Quick Meals', 'Want to Try', 'Weeknight Dinners',
];

// POST /api/admin/clean-collections
// One-time cleanup: removes all auto-generated default collections from every user.
export async function POST() {
  try {
    await connectDB();
    const result = await Collection.deleteMany({ name: { $in: DEFAULT_NAMES } });
    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `Removed ${result.deletedCount} default collection(s) across all users.`,
    });
  } catch (err) {
    console.error('clean-collections error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
