import { TestKeySchema, type TestKey } from '../../types/labReport.js';

const ALIASES: Record<Exclude<TestKey, 'other'>, string[]> = {
  glucose: [
    'glucose',
    'fasting glucose',
    'glucose fasting',
    'fbs',
    'fasting blood sugar',
    'fasting plasma glucose',
    'fpg',
    'blood sugar fasting',
    'bsf',
    'random blood sugar',
    'blood sugar random',
    'rbs',
    'random blood glucose',
    'post prandial blood glucose',
    'blood sugar',
  ],
  hba1c: [
    'hba1c',
    'hb a1c',
    'a1c',
    'glycated hemoglobin',
    'glycated haemoglobin',
    'glycosylated hemoglobin',
    'glycosylated haemoglobin',
    'hba1c %',
    'glycohemoglobin',
  ],
  hemoglobin: ['hemoglobin', 'haemoglobin', 'hb', 'hgb'],
  mcv: ['mcv', 'mean corpuscular volume'],
  creatinine: ['creatinine', 'serum creatinine', 'creat', 's creatinine', 's. creatinine'],
  bun: ['bun', 'blood urea nitrogen', 'urea nitrogen', 'blood urea', 'serum urea nitrogen'],
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[().,:\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeTestKey(testNameRaw: string): TestKey {
  const n = normalizeName(testNameRaw);
  for (const [key, names] of Object.entries(ALIASES)) {
    if ((names as string[]).includes(n)) return key as TestKey;
  }
  return 'other';
}

// Derive the tri-state fasting flag from printed wording only.
export function deriveFasting(testNameRaw: string, rawText: string): boolean | null {
  const n = normalizeName(`${testNameRaw} ${rawText}`);
  if (/\b(fasting|fbs|fpg|bsf)\b/.test(n)) return true;
  if (/\b(random|post ?prandial|pp|ppbs|rbs|after meal|non ?fasting)\b/.test(n))
    return false;
  return null;
}

// Server-side audit helper: rebuild a result row's deterministic fields.
export function applyDeterministicIdentity<
  T extends { test_name_raw: string; raw_text: string }
>(row: T): T & { test_key: TestKey; fasting: boolean | null } {
  return {
    ...row,
    test_key: TestKeySchema.parse(canonicalizeTestKey(row.test_name_raw)),
    fasting: deriveFasting(row.test_name_raw, row.raw_text),
  };
}
