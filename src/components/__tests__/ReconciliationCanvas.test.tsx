import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ReconciliationCanvas } from '../ReconciliationCanvas.js';
import { PrintHandoff } from '../PrintHandoff.js';
import { createPresentationModel } from '../../adapters/presentationAdapter.js';
import { buildDiffReport } from '../../engine/diffEngine.js';
import { CASE_A, CASE_B, CASE_C } from '../../data/syntheticCases.js';

describe('ReconciliationCanvas Component', () => {
  it('renders all three columns and user-facing labels for Case A', () => {
    const reportA = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const modelA = createPresentationModel(CASE_A, reportA);

    render(<ReconciliationCanvas model={modelA} />);

    expect(screen.getByTestId('source-rail-before')).toBeInTheDocument();
    expect(screen.getByTestId('review-spine')).toBeInTheDocument();
    expect(screen.getByTestId('source-rail-after')).toBeInTheDocument();

    // Verify user-facing labels
    expect(screen.getByText('APPEARS NEW')).toBeInTheDocument();
    expect(screen.getByText('EXPLICIT STOP WORDING')).toBeInTheDocument();
    expect(screen.getByText('CHANGED')).toBeInTheDocument();
    expect(screen.getAllByText('TEXT MATCHED').length).toBeGreaterThanOrEqual(1);
  });

  it('Case B: displays NEEDS CONFIRMATION for omitted calcium carbonate and never EXPLICIT STOP WORDING', () => {
    const reportB = buildDiffReport(CASE_B.beforeDoc, CASE_B.afterDoc);
    const modelB = createPresentationModel(CASE_B, reportB);

    render(<ReconciliationCanvas model={modelB} />);

    expect(screen.getByText('NEEDS CONFIRMATION')).toBeInTheDocument();
    expect(screen.queryByText('EXPLICIT STOP WORDING')).not.toBeInTheDocument();
    expect(screen.getByText('Levothyroxine')).toBeInTheDocument();
    expect(screen.getByText('Calcium carbonate')).toBeInTheDocument();
  });

  it('pins diff card and opens Evidence Inspector in-place showing exact quote lines', () => {
    const reportA = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const modelA = createPresentationModel(CASE_A, reportA);

    render(<ReconciliationCanvas model={modelA} />);

    // Click on Metformin diff card
    const metforminCard = screen.getByText('Metformin');
    fireEvent.click(metforminCard);

    // Inspector should now replace AFTER rail
    expect(screen.getByTestId('evidence-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('source-rail-after')).not.toBeInTheDocument();

    // Evidence quote check within inspector
    const inspector = screen.getByTestId('evidence-inspector');
    expect(
      within(inspector).getByText(/Metformin 500 mg tablet, 1 tablet once daily after dinner/)
    ).toBeInTheDocument();

    // Close via VIEW ORIGINAL button
    const closeBtn = screen.getByText('VIEW ORIGINAL');
    fireEvent.click(closeBtn);

    // AFTER rail restored
    expect(screen.queryByTestId('evidence-inspector')).not.toBeInTheDocument();
    expect(screen.getByTestId('source-rail-after')).toBeInTheDocument();
  });

  it('mobile segmented tabs exist semantically and switch views', () => {
    const reportA = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const modelA = createPresentationModel(CASE_A, reportA);

    render(<ReconciliationCanvas model={modelA} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(3);

    const beforeTab = tabs.find((t) => t.textContent?.includes('01 BEFORE'));
    expect(beforeTab).toBeDefined();

    if (beforeTab) {
      fireEvent.click(beforeTab);
      expect(beforeTab).toHaveAttribute('aria-selected', 'true');
    }
  });

  it('Case C: renders POSSIBLE DUPLICATE and transparent alias match', () => {
    const reportC = buildDiffReport(CASE_C.beforeDoc, CASE_C.afterDoc);
    const modelC = createPresentationModel(CASE_C, reportC);

    render(<ReconciliationCanvas model={modelC} />);

    expect(screen.getByText('POSSIBLE DUPLICATE')).toBeInTheDocument();
    expect(screen.getByText('TEXT MATCHED')).toBeInTheDocument();
  });
});

describe('PrintHandoff Component', () => {
  it('renders print handoff with exact quotes and questions using medication names', () => {
    const reportA = buildDiffReport(CASE_A.beforeDoc, CASE_A.afterDoc);
    const modelA = createPresentationModel(CASE_A, reportA);

    render(<PrintHandoff model={modelA} />);

    expect(
      screen.getByText('Questions to confirm about my medication list.')
    ).toBeInTheDocument();
    expect(screen.getByText('SYNTHETIC DEMO — NO PATIENT DATA')).toBeInTheDocument();

    // Verify patient questions mention real medication names, not diff IDs
    expect(screen.getAllByText(/Atorvastatin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/diff #/i)).not.toBeInTheDocument();
  });
});
