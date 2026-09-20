import { SourceDocumentSchema } from '../../types/medication.js';
import { buildDiffReport } from '../../engine/diffEngine.js';
import type {
  ExtractionProvider,
  ExtractionStage,
  LiveExtractionResult,
} from './types.js';

const SAFE_CLIENT_ERROR_MESSAGES: Record<string, string> = {
  METHOD_NOT_ALLOWED: 'The requested action is not supported. Please use the upload form.',
  INVALID_IMAGE: 'Please upload exactly one BEFORE image and one AFTER image (JPEG, PNG, or WebP under 5 MB each).',
  EXTRACTION_NOT_CONFIGURED: 'The extraction service is currently not configured. Please try again later or use demo cases.',
  MODEL_TIMEOUT: 'The extraction request timed out. Please retry with clearer or smaller images.',
  PROVIDER_ERROR: 'The extraction service encountered an error. No medication comparison was produced.',
  INVALID_EXTRACTION: 'The images could not be extracted reliably. No medication comparison was produced.',
};

export class LiveGeminiProvider implements ExtractionProvider {
  readonly id = 'live-gemini';
  readonly name = 'Live Gemini 3.6 Flash Extraction';

  async extract(
    beforeFile: File,
    afterFile: File,
    onStageChange?: (stage: ExtractionStage) => void,
    abortSignal?: AbortSignal
  ): Promise<LiveExtractionResult> {
    try {
      // 1. UPLOAD stage
      onStageChange?.('UPLOAD');

      const formData = new FormData();
      formData.append('before', beforeFile);
      formData.append('after', afterFile);

      // 2. EXTRACT stage
      onStageChange?.('EXTRACT');

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
        signal: abortSignal,
      });

      if (!response.ok) {
        let code: string | undefined;
        let reqId: string | undefined;
        try {
          const errJson = await response.json();
          if (errJson && typeof errJson.code === 'string') {
            code = errJson.code;
          }
          if (errJson && typeof errJson.request_id === 'string') {
            reqId = errJson.request_id;
          }
        } catch {
          // Response body was not JSON
        }

        const errorMsg =
          code && SAFE_CLIENT_ERROR_MESSAGES[code]
            ? SAFE_CLIENT_ERROR_MESSAGES[code]
            : response.status === 422
              ? SAFE_CLIENT_ERROR_MESSAGES.INVALID_EXTRACTION
              : response.status === 503
                ? SAFE_CLIENT_ERROR_MESSAGES.EXTRACTION_NOT_CONFIGURED
                : response.status === 400
                  ? SAFE_CLIENT_ERROR_MESSAGES.INVALID_IMAGE
                  : response.status === 504
                    ? SAFE_CLIENT_ERROR_MESSAGES.MODEL_TIMEOUT
                    : 'The extraction service encountered an error. No medication comparison was produced.';

        return {
          success: false,
          error: errorMsg,
          code,
          requestId: reqId,
        };
      }

      // 3. VALIDATE stage (Client-side defense validation)
      onStageChange?.('VALIDATE');

      const data = await response.json();

      if (!data.before || !data.after || !data.extraction_metadata) {
        return {
          success: false,
          error: SAFE_CLIENT_ERROR_MESSAGES.INVALID_EXTRACTION,
          code: 'INVALID_EXTRACTION',
        };
      }

      // Strictly validate with client Zod schema
      const beforeParsed = SourceDocumentSchema.safeParse(data.before);
      const afterParsed = SourceDocumentSchema.safeParse(data.after);

      if (!beforeParsed.success || !afterParsed.success) {
        return {
          success: false,
          error: SAFE_CLIENT_ERROR_MESSAGES.INVALID_EXTRACTION,
          code: 'INVALID_EXTRACTION',
          requestId: data.extraction_metadata?.request_id,
        };
      }

      // 4. COMPARE stage: Pure deterministic diff engine execution (Model never classifies)
      onStageChange?.('COMPARE');

      const report = buildDiffReport(beforeParsed.data, afterParsed.data);

      return {
        success: true,
        beforeDoc: beforeParsed.data,
        afterDoc: afterParsed.data,
        report,
        metadata: data.extraction_metadata,
      };
    } catch (err: unknown) {
      if (
        abortSignal?.aborted ||
        (err instanceof Error &&
          (err.name === 'AbortError' ||
            err.message.toLowerCase().includes('abort') ||
            err.message.toLowerCase().includes('cancelled')))
      ) {
        return {
          success: false,
          error: 'Extraction was cancelled.',
        };
      }

      return {
        success: false,
        error: 'A communication error occurred. No medication comparison was produced.',
      };
    }
  }
}

export const liveGeminiProvider = new LiveGeminiProvider();
