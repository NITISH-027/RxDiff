import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LiveGeminiProvider } from '../liveGeminiProvider.js';

describe('LiveGeminiProvider', () => {
  let provider: LiveGeminiProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new LiveGeminiProvider();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const dummyBefore = new File(['before'], 'before.png', { type: 'image/png' });
  const dummyAfter = new File(['after'], 'after.png', { type: 'image/png' });

  it('successfully calls /api/extract, re-validates client-side, and generates deterministic DiffReport', async () => {
    const mockApiResponse = {
      before: {
        document_id: 'before',
        document_type: 'prescription',
        medications: [
          {
            mention_id: 'before-001',
            raw_text: 'Atorvastatin 10 mg tablet, 1 tablet at night',
            raw_name: 'Atorvastatin',
            normalized_name: 'atorvastatin',
            strength_value: 10,
            strength_unit: 'mg',
            dose_quantity: 1,
            dose_form: 'tablet',
            route: 'oral',
            frequency_raw: 'at night',
            frequency_per_day: 1,
            timing: 'night',
            duration: null,
            status_word: 'none',
            evidence_quote: 'Atorvastatin 10 mg tablet, 1 tablet at night',
            confidence: 0.8,
          },
        ],
        extraction_warnings: [],
      },
      after: {
        document_id: 'after',
        document_type: 'discharge_list',
        medications: [
          {
            mention_id: 'after-001',
            raw_text: 'STOP Atorvastatin 10 mg tablet',
            raw_name: 'Atorvastatin',
            normalized_name: 'atorvastatin',
            strength_value: 10,
            strength_unit: 'mg',
            dose_quantity: 1,
            dose_form: 'tablet',
            route: 'oral',
            frequency_raw: null,
            frequency_per_day: null,
            timing: null,
            duration: null,
            status_word: 'stop',
            evidence_quote: 'STOP Atorvastatin 10 mg tablet',
            confidence: 0.8,
          },
        ],
        extraction_warnings: [],
      },
      extraction_metadata: {
        provider: 'gemini',
        request_id: 'test-req-123',
        warnings: [],
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse,
    });

    const stages: string[] = [];
    const res = await provider.extract(dummyBefore, dummyAfter, (s) => stages.push(s));

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.report.diffs.length).toBe(1);
      expect(res.report.diffs[0]?.category).toBe('explicitly_stopped');
      expect(res.metadata.request_id).toBe('test-req-123');
    }

    // Truthful pipeline stage transitions
    expect(stages).toEqual(['UPLOAD', 'EXTRACT', 'VALIDATE', 'COMPARE']);
  });

  it('fails closed when /api/extract returns an HTTP error and produces no comparison', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        code: 'INVALID_EXTRACTION',
        error: 'The images could not be extracted reliably. No medication comparison was produced.',
        request_id: 'fail-req-456',
      }),
    });

    const res = await provider.extract(dummyBefore, dummyAfter);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('The images could not be extracted reliably. No medication comparison was produced.');
      expect(res.requestId).toBe('fail-req-456');
    }
  });

  it('fails closed and produces no comparison when server payload fails client schema validation', async () => {
    const corruptedPayload = {
      before: {
        document_id: 'before',
        document_type: 'prescription',
        medications: [
          {
            // Missing required mention_id and evidence_quote
            raw_text: 'Missing fields',
          },
        ],
        extraction_warnings: [],
      },
      after: {
        document_id: 'after',
        document_type: 'discharge_list',
        medications: [],
        extraction_warnings: [],
      },
      extraction_metadata: {
        provider: 'gemini',
        request_id: 'corrupt-req-789',
        warnings: [],
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => corruptedPayload,
    });

    const res = await provider.extract(dummyBefore, dummyAfter);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('The images could not be extracted reliably. No medication comparison was produced.');
    }
  });

  it('handles user cancellation via AbortController', async () => {
    const controller = new AbortController();
    controller.abort();

    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const res = await provider.extract(dummyBefore, dummyAfter, undefined, controller.signal);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe('Extraction was cancelled.');
    }
  });
});
