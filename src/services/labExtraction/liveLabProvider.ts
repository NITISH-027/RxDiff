import { LabReportDocumentSchema } from '../../types/labReport.js';
import type {
  LabExtractionProvider,
  LabExtractionStage,
  LiveLabExtractionResult,
} from './types.js';

const SAFE_CLIENT_ERROR_MESSAGES: Record<string, string> = {
  METHOD_NOT_ALLOWED: 'The requested action is not supported. Please use the upload form.',
  INVALID_IMAGE: 'Please upload exactly one lab report image (JPEG, PNG, or WebP under 5 MB).',
  EXTRACTION_NOT_CONFIGURED: 'The extraction service is currently not configured. Please try again later or use demo cases.',
  MODEL_TIMEOUT: 'The extraction request timed out. Please retry with a clearer or smaller image.',
  PROVIDER_ERROR: 'The extraction service encountered an error. No lab review was produced.',
  INVALID_EXTRACTION: 'The lab report image could not be extracted reliably. No lab review was produced.',
};

export class LiveLabProvider implements LabExtractionProvider {
  readonly id = 'live-lab';
  readonly name = 'Live Gemini Lab Report Extraction';

  async extract(
    reportFile: File,
    onStageChange?: (stage: LabExtractionStage) => void,
    abortSignal?: AbortSignal
  ): Promise<LiveLabExtractionResult> {
    try {
      // 1. UPLOAD stage
      onStageChange?.('UPLOAD');

      const formData = new FormData();
      formData.append('report', reportFile);

      // 2. EXTRACT stage
      onStageChange?.('EXTRACT');

      const response = await fetch('/api/lab-extract', {
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
                    : 'The extraction service encountered an error. No lab review was produced.';

        return {
          success: false,
          error: errorMsg,
          code,
          requestId: reqId,
        };
      }

      // 3. VALIDATE stage (Client-side defense in depth)
      onStageChange?.('VALIDATE');

      const data = await response.json();

      if (!data.report || !data.extraction_metadata) {
        return {
          success: false,
          error: SAFE_CLIENT_ERROR_MESSAGES.INVALID_EXTRACTION,
          code: 'INVALID_EXTRACTION',
        };
      }

      // Strictly validate with client Zod schema
      const reportParsed = LabReportDocumentSchema.safeParse(data.report);

      if (!reportParsed.success) {
        return {
          success: false,
          error: SAFE_CLIENT_ERROR_MESSAGES.INVALID_EXTRACTION,
          code: 'INVALID_EXTRACTION',
        };
      }

      // Return the unconfirmed document. Never runs range or combination engines here.
      return {
        success: true,
        report: reportParsed.data,
        metadata: data.extraction_metadata,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: 'Extraction was canceled.',
        };
      }

      return {
        success: false,
        error:
          'A network error occurred while connecting to the extraction service. Please check your connection and try again.',
      };
    } finally {
      onStageChange?.('IDLE');
    }
  }
}

export const liveLabProvider = new LiveLabProvider();
