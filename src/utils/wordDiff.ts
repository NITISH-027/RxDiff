export interface DiffToken {
  value: string;
  type: 'unchanged' | 'added' | 'removed';
}

/**
 * Computes a word/token-level diff between two clinical evidence quotes.
 * Uses Longest Common Subsequence (LCS) on words and punctuation tokens.
 */
export function computeWordDiff(beforeText: string, afterText: string): {
  beforeTokens: DiffToken[];
  afterTokens: DiffToken[];
} {
  const tokenize = (text: string): string[] => {
    return text.match(/\S+|\s+/g) || [];
  };

  const a = tokenize(beforeText);
  const b = tokenize(afterText);

  const areEqual = (x: string, y: string) => {
    if (/^\s+$/.test(x) && /^\s+$/.test(y)) return true;
    return x.trim().toLowerCase() === y.trim().toLowerCase();
  };

  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (areEqual(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m;
  let j = n;

  const beforeResult: DiffToken[] = [];
  const afterResult: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && areEqual(a[i - 1], b[j - 1])) {
      beforeResult.unshift({ value: a[i - 1], type: 'unchanged' });
      afterResult.unshift({ value: b[j - 1], type: 'unchanged' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      afterResult.unshift({ value: b[j - 1], type: 'added' });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      beforeResult.unshift({ value: a[i - 1], type: 'removed' });
      i--;
    }
  }

  return {
    beforeTokens: beforeResult,
    afterTokens: afterResult,
  };
}
