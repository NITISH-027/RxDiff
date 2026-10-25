import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App.js';

describe('Lab Report Review Workbench UI', () => {
  beforeEach(() => {
    window.innerWidth = 1440;
    window.innerHeight = 900;
    vi.restoreAllMocks();
  });

  it('switches between Medication Comparison and Lab Report Review tabs', () => {
    render(<App />);

    const labTab = screen.getByRole('tab', { name: /Lab Report Review/i });
    expect(labTab).toBeInTheDocument();
    expect(labTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(labTab);
    expect(labTab).toHaveAttribute('aria-selected', 'true');

    // Shows Lab Report Review header
    expect(
      screen.getByText(/Laboratory Report Review & Verification/i)
    ).toBeInTheDocument();
  });

  it('Demo A: loads into confirmation table, confirms, and renders LOW flag chip and evidence', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /Lab Report Review/i }));

    // Confirmation table is rendered initially with safety instructions
    expect(
      screen.getByText(/Step 1: Clinical Safety Confirmation/i)
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Hemoglobin')
    ).toBeInTheDocument();

    // Confirm and review
    const confirmBtn = screen.getAllByRole('button', { name: /Confirm and review/i })[0];
    fireEvent.click(confirmBtn);

    // Results panel rendered
    expect(screen.getByText(/Confirmed Laboratory Findings/i)).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getAllByText('WITHIN RANGE').length).toBeGreaterThan(0);

    // Expand evidence
    const evidenceBtn = screen.getAllByRole('button', { name: /▶ View source evidence/i })[0];
    fireEvent.click(evidenceBtn);
    expect(
      screen.getByText(/Hemoglobin: 9.2 g\/dL \| Ref: 13.0 - 17.0 g\/dL/i)
    ).toBeInTheDocument();
  });

  it('Demo B: triggers combination prototype prompt upon confirmation', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /Lab Report Review/i }));

    // Select Demo B
    const demoBTab = screen.getByRole('tab', { name: /Co-Abnormality Trigger/i });
    fireEvent.click(demoBTab);

    // Confirm
    const confirmBtn = screen.getAllByRole('button', { name: /Confirm and review/i })[0];
    fireEvent.click(confirmBtn);

    // Expect prototype prompt section
    expect(
      screen.getByText(/Needs medical review - prototype prompts/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fasting glucose and HbA1c both above range/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/may require further medical review\./i)
    ).toBeInTheDocument();
  });

  it('Demo C: shows Can\'t Assess for missing range and displays qualitative result safely', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /Lab Report Review/i }));

    // Select Demo C
    const demoCTab = screen.getByRole('tab', { name: /Fail-Closed Safety/i });
    fireEvent.click(demoCTab);

    // Missing range notice shown in confirmation table
    expect(
      screen.getByText(/not printed - will show Can’t assess/i)
    ).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getAllByRole('button', { name: /Confirm and review/i })[0];
    fireEvent.click(confirmBtn);

    // Check chips
    expect(screen.getAllByText("CAN'T ASSESS").length).toBeGreaterThan(0);
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText(/Qualitative result "Trace" - not range-checkable\./i)).toBeInTheDocument();
  });

  it('allows editing values in confirmation table and tracks user_edited', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: /Lab Report Review/i }));

    // Edit Hemoglobin value to 14.5
    const hemoglobinInput = screen.getByLabelText(/Value for Hemoglobin/i);
    fireEvent.change(hemoglobinInput, { target: { value: '14.5' } });

    expect(screen.getByText(/1 field corrected/i)).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getAllByRole('button', { name: /Confirm and review/i })[0];
    fireEvent.click(confirmBtn);

    // Value should now be WITHIN RANGE and noted as user corrected
    expect(screen.getByText('User corrected')).toBeInTheDocument();
    expect(screen.getByText(/Based on your corrected value\./i)).toBeInTheDocument();
  });
});
