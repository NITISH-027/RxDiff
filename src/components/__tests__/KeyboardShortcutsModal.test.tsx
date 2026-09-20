import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal.js';

describe('KeyboardShortcutsModal', () => {
  it('does not render when isOpen is false', () => {
    render(<KeyboardShortcutsModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId('keyboard-shortcuts-modal')).not.toBeInTheDocument();
  });

  it('renders modal with shortcuts list when isOpen is true', () => {
    const handleClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByTestId('keyboard-shortcuts-modal')).toBeInTheDocument();
    expect(screen.getByText('Clinician Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Select next medication difference')).toBeInTheDocument();
    expect(screen.getByText('Open printable discharge handoff sheet')).toBeInTheDocument();

    // Click Close Button
    const closeBtn = screen.getByLabelText('Close keyboard shortcuts dialog');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const handleClose = vi.fn();
    render(<KeyboardShortcutsModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
