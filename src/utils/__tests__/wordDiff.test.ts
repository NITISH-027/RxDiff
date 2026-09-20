import { describe, it, expect } from 'vitest';
import { computeWordDiff } from '../wordDiff.js';

describe('computeWordDiff', () => {
  it('highlights frequency changes accurately', () => {
    const before = 'Metformin 500 mg tablet, 1 tablet once daily after dinner';
    const after = 'CONTINUE Metformin 500 mg tablet, 1 tablet twice daily after meals';

    const diff = computeWordDiff(before, after);

    const beforeRemoved = diff.beforeTokens.filter((t) => t.type === 'removed').map((t) => t.value.trim());
    const afterAdded = diff.afterTokens.filter((t) => t.type === 'added').map((t) => t.value.trim());

    expect(beforeRemoved).toContain('once');
    expect(beforeRemoved).toContain('dinner');
    expect(afterAdded).toContain('CONTINUE');
    expect(afterAdded).toContain('twice');
    expect(afterAdded).toContain('meals');
  });

  it('marks identical strings as all unchanged', () => {
    const quote = 'Amlodipine 5 mg tablet, 1 tablet once daily';
    const diff = computeWordDiff(quote, quote);

    expect(diff.beforeTokens.every((t) => t.type === 'unchanged')).toBe(true);
    expect(diff.afterTokens.every((t) => t.type === 'unchanged')).toBe(true);
  });
});
