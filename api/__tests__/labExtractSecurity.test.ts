// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { handleLabExtractRequest } from '../lab-extract.js';

describe('Endpoint Security & Deployment Safety (api/lab-extract.ts)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function createValidImageFile(filename: string, mimeType = 'image/png'): File {
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
    return new File([pngBytes], filename, { type: mimeType });
  }

  describe('Method Not Allowed', () => {
    it('rejects GET requests with 405 and safe JSON response { code, error, request_id }', async () => {
      const req = new Request('http://localhost/api/lab-extract', {
        method: 'GET',
      });

      const res = await handleLabExtractRequest(req);
      expect(res.status).toBe(405);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({
        code: 'METHOD_NOT_ALLOWED',
        error: 'Method Not Allowed. Use POST.',
        request_id: expect.any(String),
      });
    });
  });

  describe('Strict File Field Validation', () => {
    it('rejects request with duplicate "report" fields with 400 INVALID_IMAGE before Gemini', async () => {
      const formData = new FormData();
      formData.append('report', createValidImageFile('report1.png'));
      formData.append('report', createValidImageFile('report2.png'));

      const req = new Request('http://localhost/api/lab-extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleLabExtractRequest(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body).toEqual({
        code: 'INVALID_IMAGE',
        error: expect.stringContaining('Invalid or missing lab report image file'),
        request_id: expect.any(String),
      });
    });

    it('rejects request with extra unexpected fields with 400 INVALID_IMAGE before Gemini', async () => {
      const formData = new FormData();
      formData.append('report', createValidImageFile('report.png'));
      formData.append('extra_field', 'malicious_input');

      const req = new Request('http://localhost/api/lab-extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleLabExtractRequest(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe('INVALID_IMAGE');
    });

    it('rejects missing "report" field with 400 INVALID_IMAGE', async () => {
      const formData = new FormData();
      formData.append('wrong_key', createValidImageFile('report.png'));

      const req = new Request('http://localhost/api/lab-extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleLabExtractRequest(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe('INVALID_IMAGE');
    });
  });

  describe('Mock Isolation and Production Safety', () => {
    it('returns mock fixture when RXDIFF_MOCK_EXTRACTION=true AND NODE_ENV is development', async () => {
      process.env.RXDIFF_MOCK_EXTRACTION = 'true';
      process.env.NODE_ENV = 'development';
      delete process.env.GEMINI_API_KEY;

      const formData = new FormData();
      formData.append('report', createValidImageFile('report.png'));

      const req = new Request('http://localhost/api/lab-extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleLabExtractRequest(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.report).toBeDefined();
      expect(body.report.results).toHaveLength(1);
      expect(body.report.results[0].test_name_raw).toBe('Hemoglobin');
      expect(body.extraction_metadata.provider).toBe('mock_fixture');
    });

    it('strictly prevents mock from running in production; requires real config (503 when absent)', async () => {
      process.env.RXDIFF_MOCK_EXTRACTION = 'true';
      process.env.NODE_ENV = 'production';
      delete process.env.GEMINI_API_KEY;

      const formData = new FormData();
      formData.append('report', createValidImageFile('report.png'));

      const req = new Request('http://localhost/api/lab-extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleLabExtractRequest(req);
      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body).toEqual({
        code: 'EXTRACTION_NOT_CONFIGURED',
        error: 'Server extraction is not configured.',
        request_id: expect.any(String),
      });
    });
  });

  describe('Default Vercel Handler Compatibility', () => {
    it('invokes handleLabExtractRequest directly when given a Request instance', async () => {
      const req = new Request('http://localhost/api/lab-extract', { method: 'GET' });
      const res = (await handler(req)) as Response;
      expect(res.status).toBe(405);
    });
  });
});
