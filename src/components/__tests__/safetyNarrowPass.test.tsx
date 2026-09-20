import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../../App.js';
import { CASE_A, CASE_B, CASE_C } from '../../data/syntheticCases.js';
import { buildDiffReport } from '../../engine/diffEngine.js';
import { createPresentationModel } from '../../adapters/presentationAdapter.js';

describe('Safety Correction Pass: Bundled Demos & Directive Verbs', () => {
  beforeEach(() => {
    window.innerWidth = 1440;
    window.innerHeight = 900;
  });

  const bundledCases = [
    { name: 'Case A', caseBundle: CASE_A },
    { name: 'Case B', caseBundle: CASE_B },
    { name: 'Case C', caseBundle: CASE_C },
  ];

  it('proves NO question across all bundled synthetic cases begins with Continue/Start/Stop/Take/Hold', () => {
    const prohibitedStartRegex = /^(continue|start|stop|take|hold)\b/i;
    const allQuestions: { caseName: string; med: string; question: string; category: string }[] = [];

    for (const { name, caseBundle } of bundledCases) {
      const report = buildDiffReport(caseBundle.beforeDoc, caseBundle.afterDoc);
      const model = createPresentationModel(caseBundle, report);

      for (const item of model.diffItems) {
        allQuestions.push({
          caseName: name,
          med: item.displayName,
          question: item.patientQuestion,
          category: item.diff.category,
        });
      }
    }

    expect(allQuestions.length).toBeGreaterThan(0);

    for (const q of allQuestions) {
      // Must not begin with Continue, Start, Stop, Take, or Hold
      expect(
        prohibitedStartRegex.test(q.question),
        `Question for ${q.med} in ${q.caseName} (${q.category}) begins with a prohibited directive verb: "${q.question}"`
      ).toBe(false);

      // Must not contain "as prescribed"
      expect(
        q.question.toLowerCase().includes('as prescribed'),
        `Question for ${q.med} in ${q.caseName} contains "as prescribed": "${q.question}"`
      ).toBe(false);

      // Must ask a question ending with ?
      expect(q.question.endsWith('?')).toBe(true);
    }
  });

  it('proves ALL unchanged-item handoff questions match "Does {medicine} and this regimen match the intended current list?"', () => {
    for (const { name, caseBundle } of bundledCases) {
      const report = buildDiffReport(caseBundle.beforeDoc, caseBundle.afterDoc);
      const model = createPresentationModel(caseBundle, report);

      const unchangedItems = model.diffItems.filter((item) => item.diff.category === 'unchanged');
      for (const item of unchangedItems) {
        const expected = `Does ${item.displayName} and this regimen match the intended current list?`;
        expect(
          item.patientQuestion,
          `Unchanged item in ${name} did not match expected wording`
        ).toBe(expected);
      }
    }
  });

  it('proves bundled demos render NO extraction or match confidence percentages anywhere in DOM', () => {
    const { unmount } = render(<App />);

    // Test Case A default and pinned inspector
    expect(screen.queryByText(/Conf:/i)).toBeNull();

    // Pin each card in review spine to inspect evidence blocks
    const spine = screen.getByTestId('review-spine');
    const cards = within(spine).getAllByRole('button');

    for (const card of cards) {
      fireEvent.click(card);

      // Verify no confidence label or percentage is in the inspector
      expect(screen.queryByText(/Conf:/i)).toBeNull();
      expect(screen.queryByText(/Conf:\s*\d+%/i)).toBeNull();
      expect(screen.queryByText(/Confidence:\s*\d+%/i)).toBeNull();
      expect(screen.queryByText(/\bmatch confidence\b/i)).toBeNull();
    }

    // Verify raw body text does not contain confidence percentage patterns like "Conf: 98%"
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).not.toMatch(/Conf:\s*\d+%/i);
    expect(bodyText).not.toMatch(/confidence:\s*\d+%/i);

    unmount();
  });

  it('proves Case B and Case C also render NO confidence percentages when inspected', () => {
    const { unmount } = render(<App />);

    // Switch to Case B
    const caseBBtn = screen.getByRole('tab', { name: /B \/ Omission safety/i });
    fireEvent.click(caseBBtn);

    // Pin cards in Case B
    const spineB = screen.getByTestId('review-spine');
    const cardsB = within(spineB).getAllByRole('button');
    for (const card of cardsB) {
      fireEvent.click(card);
      expect(screen.queryByText(/Conf:/i)).toBeNull();
      expect(document.body.textContent ?? '').not.toMatch(/Conf:\s*\d+%/i);
    }

    // Switch to Case C
    const caseCBtn = screen.getByRole('tab', { name: /C \/ Alias duplicate/i });
    fireEvent.click(caseCBtn);

    // Pin cards in Case C
    const spineC = screen.getByTestId('review-spine');
    const cardsC = within(spineC).getAllByRole('button');
    for (const card of cardsC) {
      fireEvent.click(card);
      expect(screen.queryByText(/Conf:/i)).toBeNull();
      expect(document.body.textContent ?? '').not.toMatch(/Conf:\s*\d+%/i);
    }

    unmount();
  });
});
