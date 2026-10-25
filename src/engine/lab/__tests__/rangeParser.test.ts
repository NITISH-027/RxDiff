import { describe, it, expect } from 'vitest';
import { parsePrintedRange } from '../rangeParser.js';

describe('rangeParser', () => {
  describe('Closed intervals', () => {
    it('parses standard decimal interval: "13.0 - 17.0"', () => {
      const parsed = parsePrintedRange('13.0 - 17.0');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'interval', min: 13.0, max: 17.0 });
      expect(parsed?.rangeUnit).toBeNull();
    });

    it('parses no-space dash interval: "13-17"', () => {
      const parsed = parsePrintedRange('13-17');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'interval', min: 13, max: 17 });
      expect(parsed?.rangeUnit).toBeNull();
    });

    it('parses "to" interval with trailing unit: "13 to 17 g/dL"', () => {
      const parsed = parsePrintedRange('13 to 17 g/dL');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'interval', min: 13, max: 17 });
      expect(parsed?.rangeUnit).toBe('g/dl');
    });

    it('parses en-dash variant: "13.0 – 17.0"', () => {
      const parsed = parsePrintedRange('13.0 \u2013 17.0');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'interval', min: 13.0, max: 17.0 });
    });

    it('handles reference range prefix', () => {
      const parsed = parsePrintedRange('Reference Range: 70 - 99 mg/dL');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'interval', min: 70, max: 99 });
      expect(parsed?.rangeUnit).toBe('mg/dl');
    });
  });

  describe('Inequalities', () => {
    it('parses strictly less than: "< 200"', () => {
      const parsed = parsePrintedRange('< 200');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'lt', bound: 200, inclusive: false });
    });

    it('parses less than or equal without space: "<=200"', () => {
      const parsed = parsePrintedRange('<=200');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'lt', bound: 200, inclusive: true });
    });

    it('parses strictly greater than: "> 40"', () => {
      const parsed = parsePrintedRange('> 40');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'gt', bound: 40, inclusive: false });
    });

    it('parses greater than or equal: ">= 40"', () => {
      const parsed = parsePrintedRange('>= 40');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'gt', bound: 40, inclusive: true });
    });

    it('parses unicode less-than-or-equal sign: "≤ 200"', () => {
      const parsed = parsePrintedRange('\u2264 200');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'lt', bound: 200, inclusive: true });
    });

    it('parses unicode greater-than-or-equal sign: "≥ 40"', () => {
      const parsed = parsePrintedRange('\u2265 40');
      expect(parsed).not.toBeNull();
      expect(parsed?.range).toEqual({ kind: 'gt', bound: 40, inclusive: true });
    });
  });

  describe('Fail-closed cases', () => {
    it('returns null on empty string', () => {
      expect(parsePrintedRange('')).toBeNull();
      expect(parsePrintedRange('   ')).toBeNull();
      expect(parsePrintedRange(null)).toBeNull();
    });

    it('returns null on text descriptions: "see note"', () => {
      expect(parsePrintedRange('see note')).toBeNull();
    });

    it('returns null on "N/A"', () => {
      expect(parsePrintedRange('N/A')).toBeNull();
    });

    it('returns null on incomplete range: "5 -"', () => {
      expect(parsePrintedRange('5 -')).toBeNull();
    });

    it('returns null on reversed intervals: "17 - 13"', () => {
      expect(parsePrintedRange('17 - 13')).toBeNull();
    });

    it('returns null on unsupported phrasing: "up to 200"', () => {
      expect(parsePrintedRange('up to 200')).toBeNull();
    });
  });
});
