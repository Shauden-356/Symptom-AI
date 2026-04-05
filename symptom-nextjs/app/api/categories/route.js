import { NextResponse } from 'next/server';
import { CATEGORIES } from '../_model';

export async function GET() {
  return NextResponse.json(CATEGORIES);
}
