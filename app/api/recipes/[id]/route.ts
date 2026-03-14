import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';

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

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Recipe fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}
