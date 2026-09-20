import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../App.js';

describe('Stage 3 Dual Mode Workbench (App.tsx)', () => {
  beforeEach(() => {
    window.innerWidth = 1440;
    window.innerHeight = 900;
    vi.restoreAllMocks();
  });

  it('renders mode switch and defaults to DEMO CASES mode', () => {
    render(<App />);

    const demoTab = screen.getByRole('tab', { name: /demo cases/i });
    const uploadTab = screen.getByRole('tab', { name: /analyze images/i });

    expect(demoTab).toBeInTheDocument();
    expect(uploadTab).toBeInTheDocument();
    expect(demoTab).toHaveAttribute('aria-selected', 'true');
    expect(uploadTab).toHaveAttribute('aria-selected', 'false');

    // Demo case selectors visible
    expect(screen.getByRole('tab', { name: /A \/ Regimen changes/i })).toBeInTheDocument();
  });

  it('switches to ANALYZE IMAGES mode with disclaimer and dropzones', () => {
    render(<App />);

    const uploadTab = screen.getByRole('tab', { name: /analyze images/i });
    fireEvent.click(uploadTab);

    expect(uploadTab).toHaveAttribute('aria-selected', 'true');

    // Disclaimer text is present
    expect(
      screen.getByText(/Prototype only\. Use de-identified medication lists\./i)
    ).toBeInTheDocument();

    // Checkbox is present and unchecked
    const checkbox = screen.getByRole('checkbox', {
      name: /I removed names, IDs, addresses/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    // Dual dropzones
    expect(screen.getByText(/01 BEFORE IMAGE/i)).toBeInTheDocument();
    expect(screen.getByText(/02 AFTER IMAGE/i)).toBeInTheDocument();

    // Analyze button is disabled initially
    const analyzeBtn = screen.getByRole('button', { name: /analyze medication lists/i });
    expect(analyzeBtn).toBeDisabled();
  });

  it('enables ANALYZE button only when both images are loaded and disclaimer checkbox is checked', () => {
    render(<App />);

    const uploadTab = screen.getByRole('tab', { name: /analyze images/i });
    fireEvent.click(uploadTab);

    const checkbox = screen.getByRole('checkbox', {
      name: /I removed names, IDs, addresses/i,
    });
    const analyzeBtn = screen.getByRole('button', { name: /analyze medication lists/i });

    expect(analyzeBtn).toBeDisabled();

    // Check checkbox
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(analyzeBtn).toBeDisabled(); // Still disabled without images

    // Simulate selecting both images
    const beforeInput = screen.getByLabelText(/01 BEFORE IMAGE/i);
    const afterInput = screen.getByLabelText(/02 AFTER IMAGE/i);

    const fakeBefore = new File(['before-img'], 'prescription.png', { type: 'image/png' });
    const fakeAfter = new File(['after-img'], 'discharge.png', { type: 'image/png' });

    fireEvent.change(beforeInput, { target: { files: [fakeBefore] } });
    expect(analyzeBtn).toBeDisabled(); // Still needs after image

    fireEvent.change(afterInput, { target: { files: [fakeAfter] } });

    // Now both images and checkbox are present
    expect(analyzeBtn).toBeEnabled();

    // Unchecking checkbox disables button again
    fireEvent.click(checkbox);
    expect(analyzeBtn).toBeDisabled();
  });

  it('preserves files and displays safe inline error on failure without silently falling back to demo', async () => {
    // Mock fetch to simulate validation failure
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        code: 'INVALID_EXTRACTION',
        error: 'The images could not be extracted reliably. No medication comparison was produced.',
        request_id: 'fail-test-123',
      }),
    });

    render(<App />);

    const uploadTab = screen.getByRole('tab', { name: /analyze images/i });
    fireEvent.click(uploadTab);

    const checkbox = screen.getByRole('checkbox', {
      name: /I removed names, IDs, addresses/i,
    });
    fireEvent.click(checkbox);

    const beforeInput = screen.getByLabelText(/01 BEFORE IMAGE/i);
    const afterInput = screen.getByLabelText(/02 AFTER IMAGE/i);

    const fakeBefore = new File(['before-img'], 'prescription.png', { type: 'image/png' });
    const fakeAfter = new File(['after-img'], 'discharge.png', { type: 'image/png' });

    fireEvent.change(beforeInput, { target: { files: [fakeBefore] } });
    fireEvent.change(afterInput, { target: { files: [fakeAfter] } });

    const analyzeBtn = screen.getByRole('button', { name: /analyze medication lists/i });
    expect(analyzeBtn).toBeEnabled();

    // Click Analyze
    fireEvent.click(analyzeBtn);

    // Wait for failure alert to appear
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/No medication comparison was produced/i);
    expect(alert).toHaveTextContent(/The images could not be extracted reliably/i);
    expect(alert).not.toHaveTextContent(/Evidence quote does not match/i);

    // Files remain preserved in the dropzones
    expect(screen.getByText('prescription.png')).toBeInTheDocument();
    expect(screen.getByText('discharge.png')).toBeInTheDocument();

    // Demo Cases remains one click away
    const demoTab = screen.getByRole('tab', { name: /demo cases/i });
    fireEvent.click(demoTab);
    expect(demoTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /A \/ Regimen changes/i })).toBeInTheDocument();
  });
});
