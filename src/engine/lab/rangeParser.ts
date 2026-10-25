export type ParsedRange =
  | { kind: 'interval'; min: number; max: number }
  | { kind: 'lt'; bound: number; inclusive: boolean } // normal: value below bound
  | { kind: 'gt'; bound: number; inclusive: boolean }; // normal: value above bound

export interface ParsedPrintedRange {
  range: ParsedRange;
  rangeUnit: string | null; // unit token inside the range string, if printed
  label: string; // normalized display label
}

const NUM = /^-?\d+(?:[.,]\d+)?/;
const TRAILING_UNIT = /\s([a-z%][a-z0-9%/^.\d]*)$/i;
const LABEL_PREFIX =
  /^(biological reference interval|reference interval|reference range|ref\.? range|normal range|normal|range|ref)\.?\s*[:\-]?\s*/i;

function toNumber(token: string): number | null {
  const n = Number(token.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function normalizeUnit(unit: string | null): string | null {
  if (!unit) return null;
  return unit.trim().toLowerCase().replace(/\s+/g, '').replace(/\u00b5/g, 'u');
}

// Reads one leading number token; returns it plus the remaining text.
function readNumber(s: string): { value: number; rest: string } | null {
  const m = s.match(NUM);
  if (!m) return null;
  const value = toNumber(m[0]);
  if (value === null) return null;
  return { value, rest: s.slice(m[0].length).trim() };
}

// Returns null for any format that is not one of the five supported forms.
export function parsePrintedRange(raw: string | null): ParsedPrintedRange | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;

  // Normalize unicode dashes (en/em/figure/minus) and comparators.
  s = s.replace(/[\u2012-\u2015\u2212]/g, '-');
  s = s.replace(/\u2264/g, ' lte ').replace(/\u2265/g, ' gte ');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(LABEL_PREFIX, '');

  // Optional trailing unit, e.g. "70 - 99 mg/dl".
  let rangeUnit: string | null = null;
  const unitMatch = s.match(TRAILING_UNIT);
  if (unitMatch && /[a-z%]/i.test(unitMatch[1])) {
    rangeUnit = unitMatch[1];
    s = s.slice(0, unitMatch.index).trim();
  }
  if (!s) return null;

  const label = raw.trim();

  // Inequality forms. Two-character operators first. " lte " and " gte "
  // are the normalized unicode comparators.
  const ineq = (
    op: 'lt' | 'gt',
    inclusive: boolean,
    rest: string
  ): ParsedPrintedRange | null => {
    const n = readNumber(rest);
    if (!n || n.rest !== '') return null;
    return { range: { kind: op, bound: n.value, inclusive }, rangeUnit, label };
  };

  if (s.startsWith(' lte ')) return ineq('lt', true, s.slice(5).trim());
  if (s.startsWith(' gte ')) return ineq('gt', true, s.slice(5).trim());
  if (s.startsWith('lte ')) return ineq('lt', true, s.slice(4).trim());
  if (s.startsWith('gte ')) return ineq('gt', true, s.slice(4).trim());

  const first = s[0];
  const second = s[1];
  if (first === '<' || first === '>') {
    const kind = first === '<' ? 'lt' : 'gt';
    if (second === '=') return ineq(kind, true, s.slice(2).trim());
    if (second === ' ') return ineq(kind, false, s.slice(2).trim());
    return ineq(kind, false, s.slice(1).trim());
  }

  // Closed interval: "a - b" or "a to b".
  const lo = readNumber(s);
  if (!lo) return null;
  let rest = lo.rest;
  if (rest.startsWith('-')) rest = rest.slice(1).trim();
  else if (rest.startsWith('to ')) rest = rest.slice(3).trim();
  else return null;
  const hi = readNumber(rest);
  if (!hi || hi.rest !== '') return null;
  if (hi.value < lo.value) return null; // reversed interval: fail closed
  return {
    range: { kind: 'interval', min: lo.value, max: hi.value },
    rangeUnit,
    label,
  };
}
