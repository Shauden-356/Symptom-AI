import { NextResponse } from 'next/server';
import { predict } from '../_model';

export async function POST(request) {
  try {
    const body    = await request.json();
    const symptoms = body.symptoms || [];

    if (!symptoms.length) {
      return NextResponse.json({ error: 'No symptoms provided' }, { status: 400 });
    }

    const predictions = predict(symptoms);

    return NextResponse.json({
      predictions,
      symptom_count: symptoms.length,
      disclaimer:
        'This is an AI-based tool for informational purposes only. ' +
        'Always consult a qualified healthcare professional for medical advice.',
    });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
