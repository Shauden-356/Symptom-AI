import { NextResponse } from 'next/server';
import { SYMPTOMS, DISEASES } from '../_model';

export async function GET() {
  return NextResponse.json({
    status:   'ok',
    diseases: DISEASES.length,
    symptoms: SYMPTOMS.length,
  });
}
