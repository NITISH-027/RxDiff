import React, { useEffect, useRef } from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Inspection' | 'Workflow';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['J', '↓'], description: 'Select next medication difference', category: 'Navigation' },
  { keys: ['K', '↑'], description: 'Select previous medication difference', category: 'Navigation' },
  { keys: ['Enter', 'Space'], description: 'Open / Close evidence inspector for selected item', category: 'Inspection' },
  { keys: ['Esc'], description: 'Close inspector sheet or shortcuts modal', category: 'Inspection' },
  { keys: ['P'], description: 'Open printable discharge handoff sheet', category: 'Workflow' },
  { keys: ['?'], description: 'Toggle this keyboard shortcuts dialog', category: 'Workflow' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      data-testid="keyboard-shortcuts-modal"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="relative bg-white border border-[#E5E0D8] rounded-[8px] shadow-2xl max-w-md w-full p-5 space-y-4 z-10 animate-card-enter"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3D5A4C]" aria-hidden="true" />
            <h2 id="shortcuts-title" className="font-serif text-[18px] font-bold text-[#1A1D20]">
              Clinician Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-[#75808B] hover:text-[#1A1D20] p-1 rounded hover:bg-[#F5F2EB] transition-colors"
            aria-label="Close keyboard shortcuts dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-[12px] font-sans text-[#75808B] leading-relaxed">
          RxDiff enables rapid, tactile medication verification designed for clinical speed. Use these keybindings directly on the reconciliation workbench.
        </p>

        {/* Shortcuts List */}
        <div className="space-y-2">
          {SHORTCUTS.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 rounded-[4px] hover:bg-[#FAF8F5] transition-colors text-[13px]"
            >
              <span className="font-sans text-[#1A1D20]">{sc.description}</span>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {sc.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="min-w-[24px] h-[24px] px-1.5 inline-flex items-center justify-center font-mono text-[11px] font-semibold text-[#1A1D20] bg-[#FAF8F5] border border-[#D5CFBE] rounded shadow-[0_1px_0_1px_rgba(0,0,0,0.06)]"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E0D8] pt-3 flex items-center justify-between text-[11px] font-mono text-[#75808B]">
          <span>Tip: Press <kbd className="px-1 bg-[#FAF8F5] border border-[#E5E0D8] rounded text-[#1A1D20]">?</kbd> anywhere to toggle</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-[#3D5A4C] text-white rounded font-sans font-medium text-[12px] hover:bg-[#2F463B] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
