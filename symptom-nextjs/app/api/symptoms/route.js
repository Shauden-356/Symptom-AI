import { NextResponse } from 'next/server';
import { SYMPTOMS, symptomLabel } from '../_model';

export async function GET() {
  return NextResponse.json(
    SYMPTOMS.map(id => ({ id, label: symptomLabel(id) }))
  );
}
