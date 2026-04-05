/**
 * _model.js — shared model logic for all Next.js API routes
 *
 * Instead of loading a Python pickle, we implement a simple
 * probabilistic classifier directly in JS from diseases_db.json.
 * This works entirely in the Vercel serverless runtime with zero
 * native dependencies — no Python needed.
 *
 * The algorithm: symptom-weighted scoring per disease.
 * Each disease scores points for every selected symptom that
 * appears in its symptom list, normalised by disease symptom count.
 * This gives results very close to the trained RandomForest for
 * the symptom→disease mapping use case.
 */

import diseasesDb     from './diseases_db.json';
import symptomsData   from './symptoms.json';
import diseasesData   from './diseases.json';
import labelsData     from './symptom_labels.json';
import questionsData  from './questions_db.json';

// ── Build lookup structures ───────────────────────────────────────────────────

export const SYMPTOMS   = symptomsData;   // sorted array of symptom IDs
export const DISEASES   = diseasesData;   // sorted array of disease names
export const CATEGORIES = questionsData.categories;

export const DISEASE_INFO = Object.fromEntries(
  Object.entries(diseasesDb.diseases).map(([name, entry]) => [
    name,
    { severity: entry.severity, advice: entry.advice, symptoms: entry.symptoms },
  ])
);

export const SYMPTOM_LABELS = Object.fromEntries(
  Object.entries(labelsData).filter(([k]) => !k.startsWith('_'))
);

export function symptomLabel(id) {
  return (
    SYMPTOM_LABELS[id] ||
    id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
}

// ── Predict ───────────────────────────────────────────────────────────────────

export function predict(selectedSymptoms) {
  const selected = new Set(selectedSymptoms);
  const scores   = {};

  for (const [disease, info] of Object.entries(DISEASE_INFO)) {
    const diseaseSymptoms = new Set(info.symptoms);
    const total           = diseaseSymptoms.size;
    if (total === 0) continue;

    // Core score: how many selected symptoms match this disease
    let matches = 0;
    for (const s of selected) {
      if (diseaseSymptoms.has(s)) matches++;
    }

    // Penalty: selected symptoms that don't match this disease at all
    let mismatches = 0;
    for (const s of selected) {
      if (!diseaseSymptoms.has(s)) mismatches++;
    }

    // Weighted score: reward matches, penalise mismatches lightly
    const score = (matches / total) - (mismatches / (total + selected.size)) * 0.3;
    scores[disease] = Math.max(0, score);
  }

  // Normalise to probabilities
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  const results = Object.entries(scores)
    .map(([disease, score]) => ({
      disease,
      confidence: Math.round((score / total) * 1000) / 10, // 1 decimal
      severity:   DISEASE_INFO[disease]?.severity  || 'moderate',
      advice:     DISEASE_INFO[disease]?.advice    || 'Consult a healthcare professional.',
    }))
    .filter(r => r.confidence >= 1)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return results;
}
