import { useState, useMemo } from 'react';
import { BUNDLED_CASES } from './data/syntheticCases.js';
import { buildDiffReport } from './engine/diffEngine.js';

type CaseKey = 'case-a' | 'case-b' | 'case-c';

export function App() {
  const [selectedCase, setSelectedCase] = useState<CaseKey>('case-a');
  const currentCase = BUNDLED_CASES[selectedCase];

  const report = useMemo(() => {
    return buildDiffReport(currentCase.beforeDoc, currentCase.afterDoc);
  }, [currentCase]);

  return (
    <div
      style={{
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <header
        style={{
          marginBottom: '20px',
          borderBottom: '1px solid #ccc',
          paddingBottom: '12px',
        }}
      >
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
          RxDiff Stage 1 - Engine Verification Viewer
        </h1>
        <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>
          Minimal temporary developer page for verifying deterministic diff
          engine output.
        </p>
      </header>

      {/* Case Selectors */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['case-a', 'case-b', 'case-c'] as const).map((caseId) => (
          <button
            key={caseId}
            id={`select-${caseId}`}
            onClick={() => setSelectedCase(caseId)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: selectedCase === caseId ? 'bold' : 'normal',
              backgroundColor: selectedCase === caseId ? '#1a56db' : '#f3f4f6',
              color: selectedCase === caseId ? '#fff' : '#111',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {caseId === 'case-a'
              ? 'Case A (Regimen Changes)'
              : caseId === 'case-b'
                ? 'Case B (Omission Safety)'
                : 'Case C (Alias & Duplicates)'}
          </button>
        ))}
      </div>

      {/* Case Summary */}
      <div
        style={{
          padding: '12px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>
          {currentCase.title}
        </h2>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#4b5563' }}>
          {currentCase.description}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '8px',
          }}
        >
          {Object.entries(report.counts).map(([cat, count]) => {
            if (count === 0) return null;
            return (
              <span
                key={cat}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: '#e0e7ff',
                  color: '#3730a3',
                  fontWeight: 600,
                }}
              >
                {cat}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Diff Table Summary */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>
          Diff Category Breakdown
        </h3>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db' }}
            >
              <th style={{ padding: '6px 8px' }}>ID</th>
              <th style={{ padding: '6px 8px' }}>Category</th>
              <th style={{ padding: '6px 8px' }}>Match Basis</th>
              <th style={{ padding: '6px 8px' }}>Changed Fields</th>
              <th style={{ padding: '6px 8px' }}>Explanation</th>
            </tr>
          </thead>
          <tbody>
            {report.diffs.map((diff) => (
              <tr
                key={diff.diff_id}
                style={{ borderBottom: '1px solid #e5e7eb' }}
              >
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>
                  {diff.diff_id}
                </td>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>
                  {diff.category}
                </td>
                <td style={{ padding: '6px 8px' }}>{diff.match_basis}</td>
                <td style={{ padding: '6px 8px' }}>
                  {diff.changed_fields.join(', ') || '—'}
                </td>
                <td style={{ padding: '6px 8px' }}>{diff.explanation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full JSON Dump */}
      <div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '15px' }}>
          Full DiffReport JSON
        </h3>
        <pre
          id="report-json"
          style={{
            padding: '12px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            borderRadius: '4px',
            overflowX: 'auto',
            fontSize: '12px',
            maxHeight: '400px',
          }}
        >
          {JSON.stringify(report, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default App;
