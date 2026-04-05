import { NextResponse } from 'next/server';
import { SYMPTOMS, CATEGORIES, symptomLabel } from '../_model';

export async function POST(request) {
  let selected = new Set();
  try {
    const body = await request.json();
    selected   = new Set(body.symptoms || []);
  } catch {}

  const suggestions = CATEGORIES.map(cat => {
    const relevant = SYMPTOMS.filter(
      s => cat.keywords.some(k => s.includes(k)) && !selected.has(s)
    ).slice(0, 6);

    if (!relevant.length) return null;
    return {
      category: cat.label,
      symptoms: relevant.map(s => ({ id: s, label: symptomLabel(s) })),
    };
  }).filter(Boolean);

  return NextResponse.json({ categories: suggestions });
}
