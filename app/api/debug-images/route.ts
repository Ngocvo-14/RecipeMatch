import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Recipe from '@/models/Recipe';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();
  const salmon = await Recipe.find({
    title: { $regex: /salmon/i }
  }).select('title image').limit(5).lean();

  const shrimp = await Recipe.find({
    title: { $regex: /shrimp/i }
  }).select('title image').limit(5).lean();

  return NextResponse.json({ salmon, shrimp });
}
