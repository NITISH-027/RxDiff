// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { handleExtractRequest } from '../extract.js';

describe('Endpoint Security & Deployment Safety (api/extract.ts)', () => {
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
      const req = new Request('http://localhost/api/extract', {
        method: 'GET',
      });

      const res = await handleExtractRequest(req);
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
    it('rejects request with duplicate "before" fields with 400 INVALID_IMAGE before Gemini', async () => {
      const formData = new FormData();
      formData.append('before', createValidImageFile('before1.png'));
      formData.append('before', createValidImageFile('before2.png'));

      const req = new Request('http://localhost/api/extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleExtractRequest(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body).toEqual({
        code: 'INVALID_IMAGE',
        error: expect.stringContaining('Invalid or missing image files'),
        request_id: expect.any(String),
      });
    });

    it('rejects request with extra unexpected fields with 400 INVALID_IMAGE before Gemini', async () => {
      const formData = new FormData();
      formData.append('before', createValidImageFile('before.png'));
      formData.append('after', createValidImageFile('after.png'));
      formData.append('extra_field', 'unauthorized_payload');

      const req = new Request('http://localhost/api/extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleExtractRequest(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe('INVALID_IMAGE');
    });

    it('rejects missing "after" field with 400 INVALID_IMAGE', async () => {
      const formData = new FormData();
      formData.append('before', createValidImageFile('before.png'));

      const req = new Request('http://localhost/api/extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleExtractRequest(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.code).toBe('INVALID_IMAGE');
    });
  });

  describe('Mock Isolation and Production Safety', () => {
    it('returns mock fixture when RXDIFF_MOCK_EXTRACTION=true AND NODE_ENV is development', async () => {
      process.env.RXDIFF_MOCK_EXTRACTION = 'true';
      process.env.NODE_ENV = 'development';

      const formData = new FormData();
      formData.append('before', createValidImageFile('before.png'));
      formData.append('after', createValidImageFile('after.png'));

      const req = new Request('http://localhost/api/extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleExtractRequest(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.extraction_metadata.provider).toBe('mock_fixture');
      expect(body.extraction_metadata.provider).not.toBe('gemini');
      expect(body.before.medications.length).toBeGreaterThan(0);
    });

    it('strictly prevents mock from running in production; requires real config (503 when absent)', async () => {
      process.env.RXDIFF_MOCK_EXTRACTION = 'true';
      process.env.NODE_ENV = 'production';
      delete process.env.GEMINI_API_KEY;

      const formData = new FormData();
      formData.append('before', createValidImageFile('before.png'));
      formData.append('after', createValidImageFile('after.png'));

      const req = new Request('http://localhost/api/extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleExtractRequest(req);
      // In production, mock cannot run. Without GEMINI_API_KEY, returns 503 EXTRACTION_NOT_CONFIGURED
      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body).toEqual({
        code: 'EXTRACTION_NOT_CONFIGURED',
        error: 'Server extraction is not configured.',
        request_id: expect.any(String),
      });

      // Fixtures are never returned
      expect(body.before).toBeUndefined();
      expect(body.after).toBeUndefined();
    });
  });

  describe('Zero Leakage Test', () => {
    it('proves unique fake patient/medicine string appears nowhere in response or console', async () => {
      const uniqueSecretDrug = 'SECRET_MED_XANTHOPHYLL_987654';
      const uniqueFakePatient = 'PATIENT_ALICE_WONDERLAND_54321';

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a corrupted upload containing the secret strings in file name/payload
      const formData = new FormData();
      const fakeFile = new File(
        [new TextEncoder().encode(`Patient: ${uniqueFakePatient}\nMed: ${uniqueSecretDrug}`)],
        `${uniqueFakePatient}.txt`,
        { type: 'text/plain' }
      );
      formData.append('before', fakeFile);
      formData.append('after', fakeFile);

      const req = new Request('http://localhost/api/extract', {
        method: 'POST',
        body: formData,
      });

      const res = await handleExtractRequest(req);
      expect(res.status).toBe(400);

      const responseText = await res.text();
      const responseBody = JSON.parse(responseText);

      // 1. Secret strings must not be in response body
      expect(responseText).not.toContain(uniqueSecretDrug);
      expect(responseText).not.toContain(uniqueFakePatient);

      // 2. Safe error response shape
      expect(responseBody).toEqual({
        code: 'INVALID_IMAGE',
        error: expect.any(String),
        request_id: expect.any(String),
      });

      // 3. Secret strings must not appear in any console logs
      const allLogCalls = [
        ...consoleLogSpy.mock.calls,
        ...consoleErrorSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
      ].flat().map(String).join(' ');

      expect(allLogCalls).not.toContain(uniqueSecretDrug);
      expect(allLogCalls).not.toContain(uniqueFakePatient);
    });
  });

  describe('Default Vercel Handler Compatibility', () => {
    it('invokes handleExtractRequest directly when given a Request instance', async () => {
      const req = new Request('http://localhost/api/extract', {
        method: 'GET',
      });

      const res = (await handler(req)) as Response;
      expect(res.status).toBe(405);
      const body = await res.json();
      expect(body.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
