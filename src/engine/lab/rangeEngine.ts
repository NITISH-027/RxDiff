import type { FlaggedResult, LabResult, RangeFlag } from '../../types/labReport.js';
import { normalizeUnit, parsePrintedRange, type ParsedRange } from './rangeParser.js';

function evaluateValue(value: number, range: ParsedRange): Exclude<RangeFlag, 'cant_assess'> {
  switch (range.kind) {
    case 'interval':
      if (value < range.min) return 'low';
      if (value > range.max) return 'high';
      return 'within_range';
    case 'lt':
      // Normal is value below the bound. Exclusive: bound itself is OUT.
      if (range.inclusive ? value <= range.bound : value < range.bound)
        return 'within_range';
      return 'high';
    case 'gt':
      // Normal is value above the bound. Exclusive: bound itself is OUT.
      if (range.inclusive ? value >= range.bound : value > range.bound)
        return 'within_range';
      return 'low';
  }
}

function cantAssess(result: LabResult, reason: string): FlaggedResult {
  return { result, flag: 'cant_assess', flag_reason: reason, parsed_range_label: null };
}

export function flagLabResult(result: LabResult): FlaggedResult {
  // 1. Need a numeric value. Qualitative results (Positive, Trace, "<5")
  // are displayed but never range-flagged.
  if (result.value_numeric === null) {
    const why = result.value_text
      ? `Qualitative result "${result.value_text}" - not range-checkable.`
      : 'No numeric value extracted.';
    return cantAssess(result, why);
  }

  // 2. Need a printed reference range. Never invent one.
  if (!result.reference_range_raw || !result.reference_range_raw.trim()) {
    return cantAssess(result, 'No reference range printed on the report.');
  }

  // 3. Parse the printed range. Unsupported formats fail closed.
  const parsed = parsePrintedRange(result.reference_range_raw);
  if (!parsed) {
    return cantAssess(
      result,
      `Reference range "${result.reference_range_raw}" is not in a supported format.`
    );
  }

  // 4. Unit compatibility. Never silently convert.
  const valueUnit = normalizeUnit(result.unit);
  const rangeUnitNorm = normalizeUnit(parsed.rangeUnit);
  if (rangeUnitNorm && !valueUnit) {
    return cantAssess(
      result,
      `Range is printed in ${parsed.rangeUnit} but the result has no unit.`
    );
  }

  if (rangeUnitNorm && valueUnit && rangeUnitNorm !== valueUnit) {
    return cantAssess(
      result,
      `Unit mismatch: result in ${result.unit}, range printed in ${parsed.rangeUnit}.`
    );
  }

  // 5. Evaluate.
  const flag = evaluateValue(result.value_numeric, parsed.range);
  const editedNote = result.user_edited ? ' Based on your corrected value.' : '';
  const flagLabel =
    flag === 'high' ? 'HIGH' : flag === 'low' ? 'LOW' : 'WITHIN RANGE';
  return {
    result,
    flag,
    flag_reason:
      `${flagLabel}: value ${result.value_numeric}` +
      `${result.unit ? ' ' + result.unit : ''} vs printed range ` +
      `"${result.reference_range_raw}".${editedNote}`,
    parsed_range_label: parsed.label,
  };
}
