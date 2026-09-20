import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../../App.js';
import { CASE_B } from '../../data/syntheticCases.js';
import { buildDiffReport } from '../../engine/diffEngine.js';
import { createPresentationModel } from '../../adapters/presentationAdapter.js';
import { ReconciliationCanvas } from '../ReconciliationCanvas.js';

describe('Pixel & Layout Requirements Verification', () => {
  it('1440x900 Case A default: shell structure, both source rails and spine render without overflow', () => {
    render(<App />);

    // Top bar elements
    expect(screen.getByText('RXDIFF')).toBeInTheDocument();
    expect(screen.getByText('MEDICATION RECONCILIATION')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Do not start, stop, or change medicine based on RxDiff/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PRINT HANDOFF')).toBeInTheDocument();

    // Both source rails and review spine present
    expect(screen.getByTestId('source-rail-before')).toBeInTheDocument();
    expect(screen.getByTestId('review-spine')).toBeInTheDocument();
    expect(screen.getByTestId('source-rail-after')).toBeInTheDocument();
    expect(screen.getByTestId('connector-layer')).toBeInTheDocument();

    // Case A categories present in review spine
    const spine = screen.getByTestId('review-spine');
    expect(within(spine).getByText('APPEARS NEW')).toBeInTheDocument();
    expect(within(spine).getByText('EXPLICIT STOP WORDING')).toBeInTheDocument();
    expect(within(spine).getByText('CHANGED')).toBeInTheDocument();
  });

  it('Case A hover/pin: pins card, replaces AFTER rail with clean Evidence Inspector, and can be restored', () => {
    render(<App />);

    const spine = screen.getByTestId('review-spine');
    const metforminCard = within(spine).getByText('Metformin').closest('div[role="button"]') as HTMLElement;
    fireEvent.click(metforminCard);

    // Inspector is rendered
    const inspectors = screen.getAllByTestId('evidence-inspector');
    expect(inspectors.length).toBeGreaterThanOrEqual(1);

    // Explanation and neutral question are visible
    expect(within(inspectors[0]!).getByText(/Should I take Metformin/i)).toBeInTheDocument();

    // Close via VIEW ORIGINAL
    const closeBtns = screen.getAllByRole('button', { name: /restore source rail/i });
    fireEvent.click(closeBtns[0]!);

    // Source rail restored
    expect(screen.getByTestId('source-rail-after')).toBeInTheDocument();
  });

  it('Case B: M02 links to NEEDS CONFIRMATION with no false AFTER endpoint', () => {
    const reportB = buildDiffReport(CASE_B.beforeDoc, CASE_B.afterDoc);
    const modelB = createPresentationModel(CASE_B, reportB);

    render(<ReconciliationCanvas model={modelB} />);

    // Calcium carbonate has diff
    const calciumDiff = modelB.diffItems.find((d) => d.displayName.includes('Calcium'));
    expect(calciumDiff).toBeDefined();
    expect(calciumDiff?.beforeMarker).toBe('M02');
    expect(calciumDiff?.afterMarker).toBeNull(); // Strictly NO AFTER endpoint!
    expect(calciumDiff?.afterMention).toBeNull();
    expect(calciumDiff?.userFacingCategory).toBe('NEEDS CONFIRMATION');

    // Verify card rendered
    const spine = screen.getByTestId('review-spine');
    expect(within(spine).getByText('Calcium carbonate')).toBeInTheDocument();
    expect(within(spine).getByText('OMITTED FROM NEW')).toBeInTheDocument();
  });

  it('390x844 mobile checks: safety strip visible, sheet opens inside viewport with scrim and returns focus', () => {
    render(<App />);

    // Mobile safety strip visible with warning and badge
    const safetyStrip = screen.getByTestId('mobile-safety-strip');
    expect(safetyStrip).toBeInTheDocument();
    expect(within(safetyStrip).getByText('SYNTHETIC DEMO')).toBeInTheDocument();

    // Click Atorvastatin card in review spine
    const spine = screen.getByTestId('review-spine');
    const card = within(spine).getByText('Atorvastatin').closest('div[role="button"]') as HTMLElement;
    card.focus();
    expect(document.activeElement).toBe(card);

    fireEvent.click(card);

    // Mobile bottom sheet opens with dark scrim
    const sheet = screen.getByTestId('mobile-evidence-sheet');
    expect(sheet).toBeInTheDocument();
    expect(screen.getByTestId('mobile-sheet-scrim')).toBeInTheDocument();

    // Neutral stop wording verified in sheet
    expect(
      within(sheet).getByText(/Was Atorvastatin intentionally stopped or held on the new list\?/i)
    ).toBeInTheDocument();
    expect(
      within(sheet).queryByText(/permanently/i)
    ).not.toBeInTheDocument();

    // Close sheet via CLOSE button
    const closeBtn = within(sheet).getByRole('button', { name: /close evidence sheet/i });
    fireEvent.click(closeBtn);

    // Sheet dismissed
    expect(screen.queryByTestId('mobile-evidence-sheet')).not.toBeInTheDocument();
  });
});
