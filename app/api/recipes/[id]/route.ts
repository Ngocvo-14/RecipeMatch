import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';
import { getFoodImageUrl } from '@/lib/foodImage';

export const dynamic = 'force-dynamic';

function sanitizeImage(recipe: Record<string, unknown>): Record<string, unknown> {
  const img = (recipe.imageUrl ?? recipe.image) as string | undefined;
  const bad = !img || img.trim() === '' ||
    img.includes('picsum') ||
    img.includes('loremflickr') || img.includes('X-Amz-Signature') ||
    img.includes('xqwwpy') || img.includes('xoqwpt') || img.includes('ysxwuq');
  if (!bad) return recipe;
  const ingredients = ((recipe.ingredients ?? []) as unknown[]).map((i) =>
    typeof i === 'string' ? i : ((i as Record<string, string>).name ?? ''),
  );
  const fixed = getFoodImageUrl(recipe.title as string ?? '', ingredients);
  return { ...recipe, imageUrl: fixed, image: fixed };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await Recipe.findByIdAndUpdate(id, { $set: body });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Recipe patch error:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    let recipe = null;

    // 1. Try ObjectId lookup
    if (mongoose.Types.ObjectId.isValid(id)) {
      recipe = await Recipe.findById(id).lean();
    }

    // 2. Try string _id match
    if (!recipe) {
      recipe = await Recipe.findOne({ _id: id }).lean().catch(() => null);
    }

    // 3. Try sourceId field
    if (!recipe) {
      recipe = await Recipe.findOne({ sourceId: id }).lean();
    }

    if (!recipe) {
      console.log('Recipe lookup failed for id:', id);
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(sanitizeImage(recipe as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('Recipe fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}
